import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  smartQuotes,
  emDash,
  ellipsis,
  InputRule,
} from "prosemirror-inputrules";
import { NodeType, Schema, MarkType, Mark } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { marked } from "marked"; // lightweight tokenizer
import { defaultMarkdownParser, MarkdownParser } from "prosemirror-markdown";

// Configure marked to return tokens only, NOT HTML
marked.setOptions({
  gfm: true,
  breaks: true,
});
/**
 * LLM Data for Markdown Formatting Rules
 *
 * This data structure documents all supported markdown formatting syntax
 * that can be used for training LLMs or generating documentation.
 */
export const MARKDOWN_FORMATTING_RULES = `
{
  "inline": {
    "bold": {
      "syntax": ["**text**", "__text__"],
      "description": "Makes text bold",
      "examples": ["**bold text**", "__bold text__"],
      "priority": 2
    },
    "italic": {
      "syntax": ["*text*", "_text_"],
      "description": "Makes text italic",
      "examples": ["*italic text*", "_italic text_"],
      "priority": 1
    },
    "underline": {
      "syntax": ["<u>text</u>"],
      "description": "Underlines text",
      "examples": ["<u>underlined text</u>"],
      "priority": 3
    },
    "strikethrough": {
      "syntax": ["~~text~~"],
      "description": "Strikes through text",
      "examples": ["~~strikethrough text~~"],
      "priority": 3
    },
    "inlineCode": {
      "syntax": ["\`text\`"],
      "description": "Formats text as inline code",
      "examples": ["\`code text\`"],
      "priority": 3
    },
    "link": {
      "syntax": ["[text](url)"],
      "description": "Creates a hyperlink",
      "examples": ["[link text](https://example.com)"],
      "priority": 4
    }
  },
  "block": {
    "heading": {
      "syntax": ["# text", "## text", "### text", "#### text", "##### text", "###### text"],
      "description": "Creates headings (H1-H6)",
      "examples": ["# Heading 1", "## Heading 2", "### Heading 3"],
      "priority": 5
    },
    "blockquote": {
      "syntax": ["> text"],
      "description": "Creates a blockquote",
      "examples": ["> This is a blockquote"],
      "priority": 3
    },
    "orderedList": {
      "syntax": ["1. item", "2. item"],
      "description": "Creates an ordered list",
      "examples": ["1. First item", "2. Second item"],
      "priority": 3
    },
    "bulletList": {
      "syntax": ["- item", "* item", "+ item"],
      "description": "Creates a bullet list",
      "examples": ["- List item", "* List item", "+ List item"],
      "priority": 3
    },
    "codeBlock": {
      "syntax": ["\`\`\`language\\ncode\\n\`\`\`"],
      "description": "Creates a code block",
      "examples": ["\`\`\`\\ncode block\\n\`\`\`"],
      "priority": 3
    },
    "horizontalRule": {
      "syntax": ["---", "***", "___"],
      "description": "Creates a horizontal rule",
      "examples": ["---", "***", "___"],
      "priority": 4
    },
    "image": {
      "syntax": ["![alt](url)"],
      "description": "Embeds an image",
      "examples": ["![Alt text](image.jpg)"],
      "priority": 4
    }
  },
  "commonPatterns": {
    "emphasis": {
      "description": "Common emphasis patterns and their formatting",
      "patterns": [
        "**bold** and *italic* text",
        "__bold__ and _italic_ text",
        "***bold and italic***",
        "~~strikethrough~~ text",
        "\`inline code\` snippets",
        "[links](https://example.com)"
      ]
    },
    "lists": {
      "description": "List formatting examples",
      "patterns": [
        "1. Ordered list item",
        "- Unordered list item",
        "   - Nested list item"
      ]
    },
    "headers": {
      "description": "Header formatting examples",
      "patterns": [
        "# H1 Header",
        "## H2 Header",
        "### H3 Header"
      ]
    }
  },
  "usage": {
    "typing": "Type the markdown syntax and it will automatically format",
    "undo": "Use Ctrl+Z to undo automatic formatting",
    "conflicts": "Bold (**) takes precedence over italic (*) when both could match",
    "escaping": "Use backslashes to escape special characters if needed"
  }
}
`;

/// Given a blockquote node type, returns an input rule that turns `"> "`
/// at the start of a textblock into a blockquote.
export function blockQuoteRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType);
}

/// Given a list node type, returns an input rule that turns a number
/// followed by a dot at the start of a textblock into an ordered list.
export function orderedListRule(nodeType: NodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order === +match[1]
  );
}

/// Given a list node type, returns an input rule that turns a bullet
/// (dash, plush, or asterisk) at the start of a textblock into a
/// bullet list.
export function bulletListRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}

/// Given a code block node type, returns an input rule that turns a
/// textblock starting with three backticks into a code block.
export function codeBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^```$/, nodeType);
}

/// Given a node type and a maximum level, creates an input rule that
/// turns up to that number of `#` characters followed by a space at
/// the start of a textblock into a heading whose level corresponds to
/// the number of `#` signs.
export function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp("^(#{1," + maxLevel + "})\\s$"),
    nodeType,
    (match) => ({ level: match[1].length })
  );
}

/// Mark input rules for inline formatting
/// Input rule for bold text: **text**
export function boldRule(markType: MarkType) {
  return new InputRule(
    /\*\*([^*]+)\*\*$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for bold text: __text__
export function boldRuleUnderscore(markType: MarkType) {
  return new InputRule(
    /__([^_]+)__$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for italic text: *text*
export function italicRule(markType: MarkType) {
  return new InputRule(
    /(?<![*])\*([^*]+)\*(?![*])$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for italic text: _text_
export function italicRuleUnderscore(markType: MarkType) {
  return new InputRule(
    /_([^_]+)_$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for underline text: <u>text</u>
export function underlineRule(markType: MarkType) {
  return new InputRule(
    /<u>(.*?)<\/u>$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for strikethrough text: ~~text~~
export function strikethroughRule(markType: MarkType) {
  return new InputRule(
    /~~(.*?)~~$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for inline code: `text`
export function inlineCodeRule(markType: MarkType) {
  return new InputRule(
    /`([^`]+)`$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const mark = markType.create();
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for links: [text](url)
export function linkRule(markType: MarkType) {
  return new InputRule(
    /\[([^\]]+)\]\(([^)]+)\)$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const text = match[1];
      const url = match[2];
      const mark = markType.create({ href: url });
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]));
    }
  );
}

/// Input rule for horizontal rules: ---, ***, ___
export function horizontalRuleRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^[-*_]{3,}$/, nodeType);
}

/// Input rule for images: ![alt](url)
export function imageRule(nodeType: NodeType) {
  return new InputRule(
    /!\[([^\]]*)\]\(([^)]+)\)$/,
    (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ): Transaction | null => {
      const tr = state.tr;
      const alt = match[1];
      const src = match[2];
      const node = nodeType.create({ src, alt });
      tr.replaceWith(start, end, node);
      return tr;
    }
  );
}

/// A set of input rules for creating the basic block quotes, lists,
/// code blocks, heading, and markdown inline formatting.
export function buildInputRules(schema: Schema) {
  let rules = smartQuotes.concat(ellipsis, emDash);
  let type: NodeType | MarkType | undefined;

  if ((type = schema.nodes.blockquote)) rules.push(blockQuoteRule(type));
  if ((type = schema.nodes.ordered_list)) rules.push(orderedListRule(type));
  if ((type = schema.nodes.bullet_list)) rules.push(bulletListRule(type));
  if ((type = schema.nodes.code_block)) rules.push(codeBlockRule(type));
  if ((type = schema.nodes.heading)) rules.push(headingRule(type, 3));

  // Add markdown inline formatting rules
  if ((type = schema.marks.strong)) {
    rules.push(boldRule(type as MarkType));
    rules.push(boldRuleUnderscore(type as MarkType));
  }
  if ((type = schema.marks.em)) {
    rules.push(italicRule(type as MarkType));
    rules.push(italicRuleUnderscore(type as MarkType));
  }
  if ((type = schema.marks.underline))
    rules.push(underlineRule(type as MarkType));
  if ((type = schema.marks.strike))
    rules.push(strikethroughRule(type as MarkType));
  if ((type = schema.marks.code)) rules.push(inlineCodeRule(type as MarkType));
  if ((type = schema.marks.link)) rules.push(linkRule(type as MarkType));

  return inputRules({ rules });
}
