"use server";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GROK_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function autoComplete({
  context,
  node,
  endWithSpace,
}: {
  context: string;
  node: string;
  endWithSpace: boolean;
}): Promise<string> {
  
  // MARKDOWN RULES (condensed reference)
  const MARKDOWN_FORMATTING_RULES = `
Inline: **bold** *italic* ~~strike~~ \`code\` [link](url) <u>underline</u>
Block: # heading, > quote, - list, 1. ordered, \`\`\`code\`\`\`, ---, ![img](url)
Heading levels: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
Emphasis priority: Bold > Italic when syntax conflicts
Usage: Apply formatting to emphasize key concepts, technical terms, or important phrases`;

// SYSTEM PROMPT
const systemPrompt = `You are a text completion AI for a markdown editor.

Node: ${node}

MARKDOWN_FORMATTING_RULES:
${MARKDOWN_FORMATTING_RULES}

ABSOLUTE SPACING RULES - FOLLOW EXACTLY:

1. Check if context ends with space character:
   - Ends with space → NO space at start of output
   - Does NOT end with space → GO TO STEP 2

2. Check endWithSpace parameter:
   - endWithSpace=true → START OUTPUT WITH SPACE " "
   - endWithSpace=false → NO space at start of output

EXAMPLES (study these):
• Context: "and " (has space) | endWithSpace=true → "performance matters"
• Context: "and" (no space) | endWithSpace=true → " performance matters"  
• Context: "expectations" (no space) | endWithSpace=true → " and insights"
• Context: "amaz" (no space) | endWithSpace=false → "ing breakthrough"

COMPLETION RULES:
- Output 5-15 words of natural continuation
- NO quotes, ellipses, or starting punctuation
- Use markdown (**bold**, *italic*) strategically
- Match the tone and style of input
- For headings: keep concise (3-8 words)

Your output must be ONLY the completion text with correct spacing.`;

// USER PROMPT  
const userPrompt = `Context ends with: "${context.slice(-1)}"
Full context: "${context}"
Node: ${node}
endWithSpace: ${endWithSpace}

Apply spacing rules and complete:`;
  try {
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Autocomplete error:", error);
    return "";
  }
}
// autoComplete({context:'hey there how are you doing today? I am writing a testi'});
