// Browser-side sampler for contrast-crawl.ts.
// Kept as plain JS (no TypeScript transform) so Playwright page.evaluate
// does not receive tsx/esbuild __name helpers.
module.exports = function sampleContrastDom() {
  const SELECTOR =
    "a, button, [role='button'], input, label, h1, h2, h3, h4, h5, h6, p, li, span, td, th";

  function canvasResolveColor(css) {
    if (!css || css === "transparent") return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#000000";
      ctx.fillStyle = css;
      const resolved = ctx.fillStyle;
      if (typeof resolved === "string" && resolved.startsWith("#") && resolved.length === 7) {
        return {
          r: Number.parseInt(resolved.slice(1, 3), 16),
          g: Number.parseInt(resolved.slice(3, 5), 16),
          b: Number.parseInt(resolved.slice(5, 7), 16),
          a: 1,
        };
      }
      const match = String(resolved).match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(",").map((p) => Number.parseFloat(p.trim()));
      if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts[3] === undefined ? 1 : parts[3],
      };
    } catch {
      return null;
    }
  }

  function blend(fg, bg) {
    const a = Math.min(1, Math.max(0, fg.a));
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
      a: 1,
    };
  }

  function extractGradientColors(backgroundImage) {
    const colors = [];
    const hexes = backgroundImage.match(/#([0-9a-f]{3,8})\b/gi) || [];
    for (const hex of hexes) {
      const parsed = canvasResolveColor(hex);
      // Ignore fully transparent-ish stops; soft decorative washes must not
      // become opaque dark backgrounds in the blend stack.
      if (parsed && parsed.a >= 0.45) colors.push(parsed);
    }
    const rgbs = backgroundImage.match(/rgba?\([^)]+\)/gi) || [];
    for (const rgb of rgbs) {
      const parsed = canvasResolveColor(rgb);
      if (parsed && parsed.a >= 0.45) colors.push(parsed);
    }
    return colors;
  }

  function averageColors(colors) {
    if (colors.length === 0) return null;
    const acc = colors.reduce(
      (sum, c) => ({ r: sum.r + c.r, g: sum.g + c.g, b: sum.b + c.b }),
      { r: 0, g: 0, b: 0 },
    );
    return {
      r: Math.round(acc.r / colors.length),
      g: Math.round(acc.g / colors.length),
      b: Math.round(acc.b / colors.length),
      a: 1,
    };
  }

  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity || "1") <= 0.01) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    if (rect.bottom < -20 || rect.top > window.innerHeight + 2000) return false;
    // Skip text covered by dialogs/drawers/sheets (still in DOM, but not what users see).
    const cx = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const cy = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    const topEl = document.elementFromPoint(cx, cy);
    if (topEl && topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
      const dialog = topEl.closest("[role='dialog'], [data-slot='sheet-content'], #native-mobile-drawer");
      const selfDialog = el.closest("[role='dialog'], [data-slot='sheet-content'], #native-mobile-drawer");
      if (dialog && dialog !== selfDialog) return false;
    }
    return true;
  }

  function textOf(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return (el.value || el.placeholder || el.getAttribute("aria-label") || "").trim();
    }
    const label = el.getAttribute("aria-label");
    if (label && label.trim()) return label.trim();
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function selectorHint(el) {
    const parts = [el.tagName.toLowerCase()];
    if (el.id) parts.push("#" + el.id);
    const className =
      typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    if (className) parts.push("." + className);
    const href = el.getAttribute("href");
    if (href) parts.push('[href="' + href.slice(0, 60) + '"]');
    return parts.join("");
  }

  const pageBg =
    canvasResolveColor(getComputedStyle(document.body).backgroundColor) ||
    canvasResolveColor(getComputedStyle(document.documentElement).backgroundColor) || {
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    };

  const samples = [];
  const seen = new Set();

  for (const node of Array.from(document.querySelectorAll(SELECTOR))) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.closest("iframe, svg, noscript, script, style")) continue;
    if (!isVisible(node)) continue;

    const text = textOf(node);
    if (!text || text.length < 1) continue;
    if (
      (node.tagName === "SPAN" || node.tagName === "LI") &&
      node.querySelectorAll("a,button,p,h1,h2,h3").length > 0
    ) {
      continue;
    }

    const style = getComputedStyle(node);
    const fgParsed = canvasResolveColor(style.color);
    if (!fgParsed) continue;

    let bg = { r: pageBg.r, g: pageBg.g, b: pageBg.b, a: 1 };
    let bgApproximate = false;
    let foundOpaque = false;
    let overMedia = false;
    let current = node;
    const layers = [];

    // Only treat text as "over media" when the text center sits on an image or
    // photo background — sibling thumbnails that merely overlap in bounding
    // boxes create false dark-on-dark reports on archive lists.
    const rect = node.getBoundingClientRect();
    const cx = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const cy = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
    for (const img of Array.from(document.images)) {
      if (!isVisible(img)) continue;
      const ir = img.getBoundingClientRect();
      if (ir.width < 80 || ir.height < 80) continue;
      const centerOnImage = cx >= ir.left && cx <= ir.right && cy >= ir.top && cy <= ir.bottom;
      if (centerOnImage) {
        overMedia = true;
        break;
      }
    }
    if (node.closest("[data-contrast-media]")) {
      overMedia = true;
    }

    // Elements that paint their own opaque/gradient background (e.g. CTAs on a
    // photo hero) should be judged against that paint, not the photo behind them.
    const selfBg = canvasResolveColor(style.backgroundColor);
    const selfImage = style.backgroundImage || "none";
    const selfGradientStops =
      selfImage !== "none" && /gradient/i.test(selfImage) ? extractGradientColors(selfImage) : [];
    if ((selfBg && selfBg.a >= 0.9) || selfGradientStops.length > 0) {
      overMedia = false;
    }

    while (current) {
      const cs = getComputedStyle(current);
      const bgc = canvasResolveColor(cs.backgroundColor);
      const image = cs.backgroundImage || "none";
      if (image && image !== "none") {
        if (/url\(/i.test(image)) {
          overMedia = true;
        }
        if (/gradient/i.test(image)) {
          const stops = extractGradientColors(image);
          const avg = averageColors(stops);
          if (avg) {
            layers.push(avg);
            bgApproximate = true;
            // Translucent scrims over photos are not final backgrounds.
            if (!overMedia && avg.a >= 0.98) {
              foundOpaque = true;
              break;
            }
          }
        }
      }
      if (bgc && bgc.a > 0.01) {
        layers.push(bgc);
        if (bgc.a >= 0.98 && !overMedia) {
          foundOpaque = true;
          break;
        }
      }
      current = current.parentElement;
    }

    bg = { r: pageBg.r, g: pageBg.g, b: pageBg.b, a: 1 };
    for (const layer of layers.reverse()) {
      bg = blend(layer, bg);
    }
    if (!foundOpaque || overMedia) {
      bgApproximate = true;
    }

    const fg = fgParsed.a < 0.999 ? blend(fgParsed, bg) : fgParsed;
    const snippet = text.slice(0, 80);
    const key =
      node.tagName +
      "|" +
      snippet +
      "|" +
      fg.r +
      "," +
      fg.g +
      "," +
      fg.b +
      "|" +
      bg.r +
      "," +
      bg.g +
      "," +
      bg.b;
    if (seen.has(key)) continue;
    seen.add(key);

    samples.push({
      tag: node.tagName.toLowerCase(),
      textSnippet: snippet,
      fgCss: "rgb(" + fg.r + ", " + fg.g + ", " + fg.b + ")",
      bgCss: "rgb(" + bg.r + ", " + bg.g + ", " + bg.b + ")",
      bgApproximate: bgApproximate,
      fontSizePx: Number.parseFloat(style.fontSize) || 16,
      fontWeight: style.fontWeight || "400",
      selectorHint: selectorHint(node),
      box: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    });
  }

  return samples;
};
