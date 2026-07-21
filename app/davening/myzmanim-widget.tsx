"use client";

type MyZmanimWidgetProps = {
  embedHtml?: string;
  embedUrl?: string;
  title?: string;
  className?: string;
};

export function MyZmanimWidget({
  embedHtml = "",
  embedUrl = "",
  title = "MyZmanim live zmanim",
  className,
}: MyZmanimWidgetProps) {
  if (embedHtml) {
    const srcDoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; min-height: 100%; background: transparent; }
      body { box-sizing: border-box; display: grid; justify-items: center; padding: 2px; }
      table { max-width: 100%; }
    </style>
  </head>
  <body>${embedHtml.trim()}</body>
</html>`;

    return (
      <iframe
        srcDoc={srcDoc}
        title={title}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts"
      />
    );
  }

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={title}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return null;
}
