"use server";
import { MARKDOWN_FORMATTING_RULES } from "@/components/my-editor/EditorInputRules";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GROK_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
export async function autoComplete({
  context,
  node,endWithSpace
}: {
  context: string;
  node: string;
  endWithSpace: boolean;
}): Promise<string> {
const systemPrompt = `
You are an autocomplete engine for a Prosemirror editor.
Your output must be ONLY the continuation text. No explanations, no analysis, no restating the context.

NODE: ${node}
MARKDOWN_FORMATTING_RULES: ${MARKDOWN_FORMATTING_RULES}
ENDS_WITH_SPACE: ${endWithSpace}

STRICT COMPLETION RULES — NO EXCEPTIONS:

1. Output ONLY the continuation text.
   Absolutely no meta text, no reasoning, no commentary, no quotes, no repeating any part of the input.

2. MID-WORD COMPLETION (when ENDS_WITH_SPACE is false):
   - If the context ends with a partial word (no trailing space), you MUST:
       a) Identify the final fragment, e.g., "fea"
       b) Complete ONLY a valid continuation of the SAME root
          (the completed word MUST start exactly with the fragment)
       c) Only add letters after the fragment
       d) Do NOT modify, rewrite, or restart the fragment
   - VALID completions for "fea": "ture", "sible", "rless", "st"
   - INVALID completions:
       "fetur", "future", "feature and feature", "fea fea",
       or any completion not starting EXACTLY with "fea".

3. FULL-WORD COMPLETION (when ENDS_WITH_SPACE is true):
   - If the input ends with a trailing space, begin your continuation with EXACTLY ONE space.
   Example: "This works " → "because it is predictable"

   FULL-WORD COMPLETION (when ENDS_WITH_SPACE is false **but last word is complete**):
   - If there is NO trailing space but the last word is already complete,
     begin with ONE leading space before your continuation.
   Example: "This works" → "__because it is predictable"

   *Always user this symbol '__' when you need space at start*

4. FORBIDDEN AT START:
   No punctuation, ellipses, hyphens, commas, periods, quotes, ?, !, or any symbol.

5. LENGTH:
   4–10 natural, meaningful words.

6. NODE RULES:
   - Heading → short, title-like.
   - Paragraph → natural, conversational.
   - List → continue list item appropriately.

FINAL REQUIREMENT:
Your output MUST be ONLY the raw continuation text — no extra characters, no explanations, no prefixes and the continuation text must contain ONLY lowercase alphabetical words and spaces. 
Absolutely NO punctuation is allowed anywhere in the output.
.
`;

const userPrompt = `
Context: "${context}"
Node: ${node}

Provide ONLY the continuation text.`

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    console.log(response.choices[0].message.content);
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Autocomplete error:", error);
    return "";
  }
}
// autoComplete({context:'hey there how are you doing today? I am writing a testi'});