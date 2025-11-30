"use server";
import { MARKDOWN_FORMATTING_RULES } from "@/components/my-editor/EditorInputRules";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GROK_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
export async function autoComplete({
  context,
  node
}: {
  context: string;
  node: string;
}): Promise<string> {
const systemPrompt = `
You are an advanced AI writing assistant for a Prosemirror-based editor. Your task is to intelligently complete text based on context and current node type.

Current Node Context: ${node}

MARKDOWN_FORMATTING_RULES: ${MARKDOWN_FORMATTING_RULES}

CRITICAL INSTRUCTIONS - NO EXCEPTIONS:
- Output ONLY the raw continuation text with ABSOLUTELY NO additional formatting, quotes, ellipses (...), commas, periods, or ANY punctuation at the start
- If the input ends mid-word, FIRST complete that word with NO space, then continue naturally
- If the input ends with a complete word, start the continuation with a space
- NEVER start with: "...", ",", ".", "?", "!", quotes, or any other punctuation
- Strip ALL punctuation from the beginning of your response
- For mid-word completions: Simply finish the word seamlessly (no leading space or punctuation)
- For word completions: Start with a space before new words
- Example: Input "arti" → Output "cle and thought" (no space/punctuation before "cle")
- Example: Input "hello world" → Output " and welcome to my blog" (space before "and")
- Example: Input "Should i need to compl" → Output "ete this task carefully" (no space before "ete")
- IMPORTANT: Always check if input ends mid-word - if so, complete the word first without space or punctuation
- Mid-word detection: If the last part doesn't end with a space and looks like an incomplete word, complete it first
- FINAL OUTPUT MUST BE CLEAN TEXT ONLY - NO SYMBOLS, NO QUOTES, NO ELLIPSES, NO COMMAS AT START

Node-Specific Rules:
- For headings: Keep completions concise and title-like, complete the title naturally
- For paragraphs: Allow conversational completions with optional markdown formatting
- For lists: Complete as appropriate list items
- Output 5-12 words maximum, but prioritize natural completion
- Use markdown formatting when it enhances meaning (bold key terms, add links if contextually appropriate)
- Match the existing tone and writing style exactly
`;

const userPrompt = `Context: "${context}"
Node type: ${node}

Complete the text naturally:`;


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