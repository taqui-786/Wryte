import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

type CompletionRequestBody = {
  prompt?: string;
  node?: string;
  endWithSpace?: boolean;
  lastWord?: string;
  isIncompleteWord?: boolean;
  minWords?: number;
};

const MARKDOWN_FORMATTING_RULES = `
Inline: **bold** *italic* ~~strike~~ \`code\` [link](url) <u>underline</u>
Block: # heading, > quote, - list, 1. ordered, \`\`\`code\`\`\`, ---, ![img](url)
Heading levels: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
Usage: Apply formatting only when it improves clarity.
`;

const getRecentContext = (text: string, maxChars = 500): string => {
  if (text.length <= maxChars) return text;
  return `...${text.slice(-maxChars)}`;
};

const getLastSentences = (text: string, count = 2): string => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(-count).join(" ");
};

const sanitizeCompletion = (text: string) => {
  let output = text ?? "";

  // Remove explicit reasoning wrappers if a model emits them.
  output = output.replace(/<think>[\s\S]*?<\/think>/gi, "");
  output = output.replace(/^<think>[\s\S]*$/gi, "");

  return output.trim();
};

export async function POST(req: Request) {
  try {
    const {
      prompt = "",
      node = "paragraph",
      endWithSpace = false,
      lastWord = "",
      isIncompleteWord = false,
      minWords = 2,
    }: CompletionRequestBody = await req.json();

    if (!prompt.trim()) {
      return new Response("Missing prompt", { status: 400 });
    }

    const recentContext = getRecentContext(prompt);
    const lastSentences = getLastSentences(prompt);

    const system = `You are an intelligent autocomplete model for a markdown editor called Wryte.

Current node type: ${node}

Goal:
- Continue the user's current thought naturally.
- Match tone, vocabulary, and sentence rhythm from the given context.
- Output only the completion text.

Spacing rules (highest priority):
1) If isIncompleteWord=true: complete the current word without adding a leading space.
2) If context already ends with space: do not start completion with space.
3) If context does not end with space:
   - endWithSpace=true: start with exactly one leading space.
   - endWithSpace=false: do not add a leading space.

Completion rules:
- If isIncompleteWord=false in paragraph mode, return 2-12 words (not a single word).
- If isIncompleteWord=true, return only the remaining fragment (usually 1-4 words).
- Never output reasoning, hidden thoughts, tags, or XML wrappers (e.g. <think>).
- No wrapping quotes.
- No leading punctuation unless required by grammar.
- Keep markdown valid and minimal.

Few-shot spacing examples:
- Context: "And i", isIncompleteWord=false, endWithSpace=true -> " want to explain the core ideas clearly."
- Context: "develo", isIncompleteWord=true, endWithSpace=false -> "pment process in detail"
- Context: "systems ", isIncompleteWord=false, endWithSpace=false -> "architecture and testing strategy"

Markdown rules:
${MARKDOWN_FORMATTING_RULES}`;

    const basePrompt = `Recent context: "${recentContext}"
Last sentences: "${lastSentences}"
Context ends with: "${prompt.slice(-1)}"
Current tail: "${prompt.slice(-50)}"
Last word typed: "${lastWord}"
Is incomplete word: ${isIncompleteWord}
Node: ${node}
endWithSpace: ${endWithSpace}
Minimum words expected: ${Math.max(minWords, 1)}

Generate completion:`;

    const runCompletion = async (extraInstruction?: string) => {
      const composedPrompt = extraInstruction
        ? `${basePrompt}\n\n${extraInstruction}`
        : basePrompt;

      const result = await generateText({
        model: groq("moonshotai/kimi-k2-instruct-0905"),

        system,
        prompt: composedPrompt,
        temperature: 0.4,
        maxOutputTokens: 64,
      });

      return sanitizeCompletion(result.text ?? "");
    };

    let completion = await runCompletion();

    if (!isIncompleteWord && node === "paragraph") {
      const wordCount = completion.trim().split(/\s+/).filter(Boolean).length;

      if (wordCount < Math.max(minWords, 2)) {
        completion = await runCompletion(
          `Important: return at least ${Math.max(minWords, 2)} words. Do not return a single word.`,
        );
      }
    }

    return new Response(completion, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Completion API error:", error);
    return new Response("Failed to generate completion", { status: 500 });
  }
}
