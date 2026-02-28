import { load as loadHtml } from "cheerio";

const BANNED_TAGS = new Set([
  "script",
  "noscript",
  "object",
  "embed",
  "template",
  "meta",
  "base",
]);

const ALLOWED_TAGS = new Set([
  "style",
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "i",
  "iframe",
  "img",
  "input",
  "label",
  "legend",
  "li",
  "main",
  "mark",
  "menu",
  "nav",
  "ol",
  "optgroup",
  "option",
  "p",
  "picture",
  "pre",
  "q",
  "ruby",
  "s",
  "samp",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "rect",
  "polygon",
  "polyline",
  "defs",
  "symbol",
  "use",
  "mask",
  "clippath",
  "lineargradient",
  "radialgradient",
  "stop",
  "text",
  "tspan",
]);

const URL_ATTRIBUTES = new Set([
  "href",
  "src",
  "action",
  "poster",
  "data-src",
  "data-href",
  "formaction",
  "xlink:href",
]);

const SAFE_DATA_IMAGE_PATTERN =
  /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i;

function isSrcsetDelimiter(value: string, index: number) {
  const lookahead = value.slice(index + 1).trimStart().toLowerCase();
  return (
    lookahead.startsWith("http://") ||
    lookahead.startsWith("https://") ||
    lookahead.startsWith("/") ||
    lookahead.startsWith("data:")
  );
}

function splitSrcsetCandidates(value: string) {
  const candidates: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let parenDepth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === "(") {
        parenDepth += 1;
      } else if (ch === ")") {
        parenDepth = Math.max(0, parenDepth - 1);
      } else if (ch === "," && parenDepth === 0 && isSrcsetDelimiter(value, i)) {
        const trimmed = current.trim();
        if (trimmed) {
          candidates.push(trimmed);
        }
        current = "";
        continue;
      }
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) {
    candidates.push(tail);
  }

  return candidates;
}

function parseSrcsetCandidate(candidate: string) {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0];
    const endIndex = trimmed.indexOf(quote, 1);
    if (endIndex > 0) {
      return {
        url: trimmed.slice(1, endIndex),
        descriptor: trimmed.slice(endIndex + 1).trim(),
      };
    }
  }

  const splitIndex = trimmed.search(/\s/);
  if (splitIndex < 0) {
    return {
      url: trimmed,
      descriptor: "",
    };
  }

  return {
    url: trimmed.slice(0, splitIndex),
    descriptor: trimmed.slice(splitIndex + 1).trim(),
  };
}

function sanitizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();

  if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) {
    return "";
  }

  if (normalized.startsWith("data:")) {
    return SAFE_DATA_IMAGE_PATTERN.test(raw) ? raw : "";
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("#") ||
    normalized.startsWith("?")
  ) {
    return raw;
  }

  if (!normalized.includes(":")) {
    return raw;
  }

  return "";
}

function sanitizeInlineStyle(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/\s+/g, "").toLowerCase();

  if (
    normalized.includes("expression(") ||
    normalized.includes("javascript:") ||
    normalized.includes("url(data:text/html")
  ) {
    return "";
  }

  return trimmed;
}

function sanitizeSrcsetValue(value: string) {
  const candidates = splitSrcsetCandidates(value);
  const cleaned = candidates
    .map((candidate) => {
      const parsed = parseSrcsetCandidate(candidate);
      if (!parsed) {
        return "";
      }

      const safeUrl = sanitizeUrl(parsed.url);
      if (!safeUrl) {
        return "";
      }

      return parsed.descriptor ? `${safeUrl} ${parsed.descriptor}` : safeUrl;
    })
    .filter(Boolean);

  return cleaned.join(", ");
}

export function rewriteSrcsetValue(value: string, resolveUrl: (input: string) => string) {
  const candidates = splitSrcsetCandidates(value);

  return candidates
    .map((candidate) => {
      const parsed = parseSrcsetCandidate(candidate);
      if (!parsed) {
        return "";
      }

      const rewritten = resolveUrl(parsed.url);
      return parsed.descriptor ? `${rewritten} ${parsed.descriptor}` : rewritten;
    })
    .filter(Boolean)
    .join(", ");
}

export function sanitizeMirrorHtml(html: string) {
  const $ = loadHtml(`<div id="__mirror_sanitize_root">${html}</div>`);
  const root = $("#__mirror_sanitize_root");

  root.find("*").each((_, element) => {
    const tagName = (element.tagName || "").toLowerCase();
    if (!tagName) {
      return;
    }

    if (BANNED_TAGS.has(tagName)) {
      $(element).remove();
      return;
    }

    const isCustomElementTag = tagName.includes("-");
    if (!ALLOWED_TAGS.has(tagName) && !isCustomElementTag) {
      $(element).replaceWith($(element).contents());
      return;
    }

    const attributes = Object.entries(element.attribs ?? {});
    for (const [nameRaw, valueRaw] of attributes) {
      const name = nameRaw.toLowerCase();
      const value = String(valueRaw ?? "");

      if (name.startsWith("on") || name === "srcdoc") {
        $(element).removeAttr(nameRaw);
        continue;
      }

      if (name === "style") {
        const safeStyle = sanitizeInlineStyle(value);
        if (!safeStyle) {
          $(element).removeAttr(nameRaw);
        } else {
          $(element).attr(nameRaw, safeStyle);
        }
        continue;
      }

      if (name === "srcset") {
        const safeSrcset = sanitizeSrcsetValue(value);
        if (!safeSrcset) {
          $(element).removeAttr(nameRaw);
        } else {
          $(element).attr(nameRaw, safeSrcset);
        }
        continue;
      }

      if (URL_ATTRIBUTES.has(name)) {
        const safeUrl = sanitizeUrl(value);
        if (!safeUrl) {
          $(element).removeAttr(nameRaw);
        } else {
          $(element).attr(nameRaw, safeUrl);
        }
      }
    }

    if (tagName === "a") {
      const target = ($(element).attr("target") ?? "").toLowerCase();
      if (target === "_blank") {
        const rel = ($(element).attr("rel") ?? "")
          .split(/\s+/)
          .filter(Boolean);
        if (!rel.includes("noopener")) {
          rel.push("noopener");
        }
        if (!rel.includes("noreferrer")) {
          rel.push("noreferrer");
        }
        $(element).attr("rel", rel.join(" "));
      }
    }
  });

  return root.html() ?? "";
}
