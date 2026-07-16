import assert from "node:assert/strict";
import test from "node:test";

import {
  NEWSLETTER_ARCHIVE,
  NEWSLETTERS,
  type NewsletterBlock,
  type NewsletterContentNode,
} from "@/lib/newsletters/data";

function nodeText(node: NewsletterContentNode): string {
  if (node.type === "text") return node.value;
  if (node.type === "break") return " ";
  if (node.type === "image") return "";
  return node.children.map(nodeText).join("");
}

function blockText(block: NewsletterBlock): string {
  if (block.kind === "rich") return block.nodes.map(nodeText).join("");
  if (block.kind === "button") return block.label;
  return "";
}

function collectImageSources(node: NewsletterContentNode): string[] {
  if (node.type === "image") return [node.src];
  if (node.type === "text" || node.type === "break") return [];
  return node.children.flatMap(collectImageSources);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

test("the local newsletter archive contains every Mailchimp campaign", () => {
  assert.equal(NEWSLETTER_ARCHIVE.issueCount, 21);
  assert.equal(NEWSLETTER_ARCHIVE.assetCount, 14);
  assert.equal(NEWSLETTERS.length, 21);
  assert.equal(new Set(NEWSLETTERS.map((issue) => issue.slug)).size, 21);
  assert.equal(new Set(NEWSLETTERS.map((issue) => issue.campaignId)).size, 21);
  assert.equal(NEWSLETTERS[0]?.title, "Reminder: Rabbi Gotlib's New Class Begins Tomorrow Night!");
  assert.ok(NEWSLETTERS.every((issue) => issue.blocks.length > 0));
});

test("every newsletter preserves its complete visible source text", () => {
  for (const issue of NEWSLETTERS) {
    const renderedText = normalize(issue.blocks.map(blockText).join(" "));
    assert.equal(renderedText, normalize(issue.searchText), issue.slug);
  }
});

test("every imported newsletter image is served locally", () => {
  for (const issue of NEWSLETTERS) {
    const sources = issue.blocks.flatMap((block) => {
      if (block.kind === "image") return [block.node.src];
      if (block.kind === "rich") return block.nodes.flatMap(collectImageSources);
      return [];
    });
    assert.ok(sources.every((source) => source.startsWith("/newsletters/archive/assets/")), issue.slug);
  }
});
