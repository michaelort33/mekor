"use client";

import { useEffect, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!embedHtml || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = "";

    const template = document.createElement("template");
    template.innerHTML = embedHtml.trim();

    for (const childNode of template.content.childNodes) {
      if (childNode.nodeName.toLowerCase() !== "script") {
        container.appendChild(childNode.cloneNode(true));
        continue;
      }

      const sourceScript = childNode as HTMLScriptElement;
      const runtimeScript = document.createElement("script");

      for (const { name, value } of Array.from(sourceScript.attributes)) {
        runtimeScript.setAttribute(name, value);
      }

      runtimeScript.textContent = sourceScript.textContent;
      container.appendChild(runtimeScript);
    }

    return () => {
      container.innerHTML = "";
    };
  }, [embedHtml]);

  if (embedHtml) {
    return <div ref={containerRef} className={className} />;
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
