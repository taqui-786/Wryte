import z from "zod";
import type { AIChange } from "@/components/my-editor/MyEditor";

const ChangeSchema = z.object({
  line: z.number().int().positive(),
  type: z.enum(["replace", "delete", "insert"]),
  content: z.string(),
});

const AIResponseSchema = z.object({
  elements: z.array(z.any()),
});

function safeParseChanges(input: unknown): AIChange[] {
  let parsed = input;

  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      console.error("Failed to JSON.parse AI output", err);
      return [];
    }
  }

  let rawItems: unknown[];
  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else {
    const result = AIResponseSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Invalid AI output shape", result.error);
      return [];
    }
    rawItems = result.data.elements;
  }

  const validated: AIChange[] = [];
  for (const item of rawItems) {
    const res = ChangeSchema.safeParse(item);
    if (res.success) {
      validated.push(res.data);
    }
  }

  return validated;
}

function extractJsonObjectsFromStream(text: string): unknown[] {
  const objects: unknown[] = [];
  let inString = false;
  let isEscaped = false;
  let bracketDepth = 0;
  let braceDepth = 0;
  let objStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "[") {
      bracketDepth += 1;
      continue;
    }

    if (ch === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (bracketDepth < 1) continue;

    if (ch === "{") {
      if (braceDepth === 0) {
        objStart = i;
      }
      braceDepth += 1;
      continue;
    }

    if (ch === "}") {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      if (braceDepth === 0 && objStart >= 0) {
        const slice = text.slice(objStart, i + 1);
        objStart = -1;
        try {
          objects.push(JSON.parse(slice));
        } catch {
          // Ignore invalid partial object.
        }
      }
    }
  }

  return objects;
}

export function safeParseChangesFromStream(input: string): AIChange[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const direct = safeParseChanges(trimmed);
  if (direct.length > 0) return direct;

  const rawObjects = extractJsonObjectsFromStream(trimmed);
  if (rawObjects.length === 0) return [];

  const validated: AIChange[] = [];
  for (const item of rawObjects) {
    const res = ChangeSchema.safeParse(item);
    if (res.success) validated.push(res.data);
  }

  return validated;
}

export const looksLikeJson = (text: string) => /^[[{]/.test(text.trim());

const isListItemLine = (line: string) =>
  /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line.trim());

export const dedupeChanges = (changes: AIChange[]) => {
  const seen = new Set<string>();
  const result: AIChange[] = [];

  for (const change of changes) {
    const key = `${change.line}|${change.type}|${change.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(change);
  }

  return result;
};

export const buildMarkdownFromInsertChanges = (changes: AIChange[]) => {
  const sorted = [...changes].sort((a, b) => a.line - b.line);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const content = sorted[i].content ?? "";
    if (i === 0) {
      parts.push(content);
      continue;
    }

    const prev = sorted[i - 1].content ?? "";
    const prevIsList = isListItemLine(prev);
    const currIsList = isListItemLine(content);
    const joiner = prevIsList && currIsList ? "\n" : "\n\n";
    parts.push(joiner, content);
  }

  return parts.join("");
};

export const isSequentialInsertDocument = (changes: AIChange[]) => {
  if (changes.length === 0) return false;
  if (!changes.every((change) => change.type === "insert")) return false;

  const sorted = [...changes].sort((a, b) => a.line - b.line);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].line !== i + 1) return false;
  }

  return true;
};
