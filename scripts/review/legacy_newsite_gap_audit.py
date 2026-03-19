from __future__ import annotations

import csv
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
LEGACY_EXPORT_ROOT = ROOT / "output" / "mekorhabracha-site-export-2026-03-09"
LEGACY_MANIFEST_PATH = LEGACY_EXPORT_ROOT / "manifest.json"
DEFAULT_BASE_URL = "http://localhost:3001"
REPORT_ROOT = ROOT / "reports" / f"legacy-newsite-audit-{datetime.now().date().isoformat()}"


@dataclass
class LegacyPage:
    index: int
    old_url: str
    old_path: str
    folder: Path
    title: str
    lines: list[str]
    old_word_count: int


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_line(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def extract_body_text_from_markdown(markdown_text: str) -> str:
    marker = "## Body Text"
    if marker not in markdown_text:
      return markdown_text
    section = markdown_text.split(marker, 1)[1]
    if "```text" in section:
        section = section.split("```text", 1)[1]
        section = section.split("```", 1)[0]
    return section.strip()


def significant_lines(text: str) -> list[str]:
    lines: list[str] = []
    seen: set[str] = set()
    for raw_line in text.splitlines():
        line = normalize_whitespace(raw_line)
        normalized = normalize_line(line)
        if len(normalized) < 18:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        lines.append(line)
    return lines


def extract_text_from_html(html: str) -> tuple[str, list[str], str]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    root = soup.find("main") or soup.find("article") or soup.body or soup
    text = root.get_text("\n", strip=True)
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    description_tag = soup.find("meta", attrs={"name": "description"})
    description = description_tag.get("content", "").strip() if description_tag else ""
    return text, significant_lines(text), description


def load_legacy_pages() -> list[LegacyPage]:
    manifest = json.loads(LEGACY_MANIFEST_PATH.read_text())
    pages: list[LegacyPage] = []
    for record in manifest:
        if record.get("status") != "ok" or record.get("kind") != "html":
            continue
        folder = Path(record["outputDir"])
        content_path = folder / "content.md"
        if not content_path.exists():
            continue
        markdown_text = content_path.read_text()
        body_text = extract_body_text_from_markdown(markdown_text)
        lines = significant_lines(body_text)
        path_value = urlparse(record["url"]).path or "/"
        if urlparse(record["url"]).query:
            path_value += f"?{urlparse(record['url']).query}"
        pages.append(
            LegacyPage(
                index=record["index"],
                old_url=record["url"],
                old_path=path_value,
                folder=folder,
                title=record.get("title", ""),
                lines=lines,
                old_word_count=len(re.findall(r"\b\w+\b", body_text)),
            )
        )
    return pages


def filter_boilerplate(pages: Iterable[LegacyPage]) -> tuple[list[LegacyPage], set[str]]:
    counts: Counter[str] = Counter()
    for page in pages:
        counts.update(normalize_line(line) for line in page.lines)
    boilerplate = {line for line, count in counts.items() if count >= 25}

    filtered_pages: list[LegacyPage] = []
    for page in pages:
        filtered = [line for line in page.lines if normalize_line(line) not in boilerplate]
        filtered_pages.append(
            LegacyPage(
                index=page.index,
                old_url=page.old_url,
                old_path=page.old_path,
                folder=page.folder,
                title=page.title,
                lines=filtered,
                old_word_count=page.old_word_count,
            )
        )
    return filtered_pages, boilerplate


def route_candidates_from_app() -> list[str]:
    candidates: list[str] = []
    for page_file in (ROOT / "app").glob("**/page.tsx"):
        rel = page_file.relative_to(ROOT / "app")
        parts = list(rel.parts[:-1])
        if not parts:
            candidates.append("/")
            continue
        if any(part.startswith("[") for part in parts):
            continue
        candidates.append("/" + "/".join(parts))
    return sorted(set(candidates))


def suggest_new_path(old_path: str, static_routes: list[str]) -> str:
    if old_path in static_routes:
        return old_path
    old_slug = old_path.strip("/").split("/")[-1]
    candidates = [route for route in static_routes if old_slug and old_slug in route]
    return candidates[0] if candidates else ""


def compare_page(session: requests.Session, base_url: str, page: LegacyPage, static_routes: list[str]) -> dict:
    target_url = f"{base_url.rstrip('/')}{page.old_path}"
    response = session.get(target_url, timeout=30)
    result = {
        "old_url": page.old_url,
        "old_path": page.old_path,
        "new_url": target_url,
        "status_code": response.status_code,
        "title_old": page.title,
        "title_new": "",
        "old_word_count": page.old_word_count,
        "new_word_count": 0,
        "matched_line_count": 0,
        "old_line_count": len(page.lines),
        "line_coverage": 0.0,
        "missing_lines": [],
        "suggested_new_path": "",
        "notes": "",
    }

    if response.status_code != 200:
        result["suggested_new_path"] = suggest_new_path(page.old_path, static_routes)
        result["notes"] = "Route does not currently resolve on the new site"
        return result

    new_text, _, description = extract_text_from_html(response.text)
    new_normalized = normalize_line(new_text + "\n" + description)
    matched_lines: list[str] = []
    missing_lines: list[str] = []
    for line in page.lines:
        if normalize_line(line) and normalize_line(line) in new_normalized:
            matched_lines.append(line)
        else:
            missing_lines.append(line)

    title_match = re.search(r"<title>(.*?)</title>", response.text, re.IGNORECASE | re.DOTALL)
    result["title_new"] = normalize_whitespace(title_match.group(1)) if title_match else ""
    result["new_word_count"] = len(re.findall(r"\b\w+\b", new_text))
    result["matched_line_count"] = len(matched_lines)
    result["line_coverage"] = round(len(matched_lines) / max(len(page.lines), 1), 3)
    result["missing_lines"] = missing_lines[:12]

    if result["line_coverage"] >= 0.8:
        result["notes"] = "Strong copy coverage"
    elif result["line_coverage"] >= 0.4:
        result["notes"] = "Partial copy coverage"
    else:
        result["notes"] = "Low copy coverage"

    return result


def write_outputs(base_url: str, results: list[dict], boilerplate: set[str]) -> None:
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    json_path = REPORT_ROOT / "audit.json"
    csv_path = REPORT_ROOT / "audit.csv"
    md_path = REPORT_ROOT / "SUMMARY.md"

    json_path.write_text(json.dumps({"base_url": base_url, "results": results}, indent=2))

    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "old_url",
                "old_path",
                "new_url",
                "status_code",
                "title_old",
                "title_new",
                "old_word_count",
                "new_word_count",
                "old_line_count",
                "matched_line_count",
                "line_coverage",
                "suggested_new_path",
                "notes",
            ],
        )
        writer.writeheader()
        for row in results:
            writer.writerow({key: row.get(key, "") for key in writer.fieldnames})

    missing_routes = [row for row in results if row["status_code"] != 200]
    low_coverage = [row for row in results if row["status_code"] == 200 and row["line_coverage"] < 0.4]
    partial_coverage = [
        row for row in results if row["status_code"] == 200 and 0.4 <= row["line_coverage"] < 0.8
    ]
    strong_coverage = [row for row in results if row["status_code"] == 200 and row["line_coverage"] >= 0.8]

    lines = [
        "# Legacy to New Site Audit",
        "",
        f"- Compared against: {base_url}",
        f"- Legacy export root: {LEGACY_EXPORT_ROOT}",
        f"- Total legacy HTML pages checked: {len(results)}",
        f"- Strong copy coverage: {len(strong_coverage)}",
        f"- Partial copy coverage: {len(partial_coverage)}",
        f"- Low copy coverage: {len(low_coverage)}",
        f"- Missing routes: {len(missing_routes)}",
        f"- Boilerplate legacy lines ignored: {len(boilerplate)}",
        "",
        "## Missing Routes",
        "",
    ]

    if missing_routes:
        for row in missing_routes[:40]:
            suggestion = f" -> suggested {row['suggested_new_path']}" if row["suggested_new_path"] else ""
            lines.append(f"- `{row['old_path']}` -> `{row['status_code']}`{suggestion}")
    else:
        lines.append("- None")

    lines.extend(["", "## Lowest Coverage Pages", ""])
    lowest = sorted(
        [row for row in results if row["status_code"] == 200],
        key=lambda row: row["line_coverage"],
    )[:40]
    if lowest:
        for row in lowest:
            lines.append(f"- `{row['old_path']}` coverage `{row['line_coverage']}`")
            for missing in row["missing_lines"][:5]:
                lines.append(f"  missing: {missing}")
    else:
        lines.append("- None")

    md_path.write_text("\n".join(lines) + "\n")


def main() -> None:
    import sys

    base_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    legacy_pages = load_legacy_pages()
    legacy_pages, boilerplate = filter_boilerplate(legacy_pages)
    static_routes = route_candidates_from_app()

    session = requests.Session()
    results = [compare_page(session, base_url, page, static_routes) for page in legacy_pages]
    write_outputs(base_url, results, boilerplate)
    print(json.dumps({"report_root": str(REPORT_ROOT), "pages_checked": len(results)}, indent=2))


if __name__ == "__main__":
    main()
