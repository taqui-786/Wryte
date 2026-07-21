import { marked } from "marked";

export function addDataLineAttributes(html: string): string {
  if (!html) return html;
  if (typeof document === "undefined") return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  const blockTags = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "PRE",
    "UL",
    "OL",
    "HR",
    "DIV",
    "TABLE",
  ]);

  let lineNumber = 0;
  Array.from(container.children).forEach((element) => {
    if (!blockTags.has(element.tagName)) return;
    lineNumber += 1;
    element.setAttribute("data-line", String(lineNumber));
  });

  return container.innerHTML;
}

export function buildEditorContentFromMarkdown(markdown: string): string {
  const html = marked.parse(markdown ?? "") as string;
  return addDataLineAttributes(html);
}
