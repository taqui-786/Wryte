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
  lastWord = "",
  isIncompleteWord = false,
}: {
  context: string;
  node: string;
  endWithSpace: boolean;
  lastWord?: string;
  isIncompleteWord?: boolean;
}): Promise<string> {
  // Extract recent context for better semantic understanding
  const getRecentContext = (text: string, maxChars: number = 500): string => {
    if (text.length <= maxChars) return text;
    return "..." + text.slice(-maxChars);
  };

  // Analyze the last few sentences for context
  const getLastSentences = (text: string, count: number = 2): string => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(-count).join(" ");
  };

  const recentContext = getRecentContext(context);
  const lastSentences = getLastSentences(context);

  // MARKDOWN RULES (condensed reference)
  const MARKDOWN_FORMATTING_RULES = `
Inline: **bold** *italic* ~~strike~~ \`code\` [link](url) <u>underline</u>
Block: # heading, > quote, - list, 1. ordered, \`\`\`code\`\`\`, ---, ![img](url)
Heading levels: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
Emphasis priority: Bold > Italic when syntax conflicts
Usage: Apply formatting to emphasize key concepts, technical terms, or important phrases`;

  // SYSTEM PROMPT
  const systemPrompt = `You are an intelligent text completion AI for a markdown-based writing editor called "Wryte".

Current Node Type: ${node}

CORE OBJECTIVE:
Generate natural, contextually relevant text continuations that seamlessly extend the writer's thought.

USER WRITING STYLE ANALYSIS:
CRITICAL: You MUST analyze the provided context to learn and replicate the user's unique writing characteristics:
1. TONE: Identify if the writing is formal, casual, professional, friendly, technical, creative, etc.
2. VOCABULARY LEVEL: Match the complexity of words used (simple/conversational, intermediate, advanced/technical)
3. SENTENCE STRUCTURE: Mirror their sentence length patterns (short and punchy vs. long and flowing)
4. WRITING PATTERNS: Detect their preferred phrases, transitional words, and expression style
5. FORMATTING PREFERENCES: Note how they use markdown, emphasis, lists, and structure

ENFORCE STYLE MATCHING:
- Your completion MUST sound like it was written by the same person
- Match their vocabulary sophistication level exactly
- Replicate their sentence rhythm and flow
- Use similar transitional phrases and connectors they prefer
- Maintain their level of formality/informality consistently
- If they write simply, keep it simple. If they write elaborately, match that complexity.

MARKDOWN_FORMATTING_RULES:
${MARKDOWN_FORMATTING_RULES}

⚠️ ABSOLUTE SPACING RULES - THIS IS THE MOST CRITICAL REQUIREMENT ⚠️

INTELLIGENT WORD COMPLETION DETECTION:

You are given two critical parameters:
1. lastWord: The last word/fragment the user typed (e.g., "creat", "element", "have")
2. isIncompleteWord: Boolean flag indicating if this word looks incomplete

COMPLETION STRATEGY:

A) INCOMPLETE WORD COMPLETION (isIncompleteWord = true):
   → Complete the word WITHOUT leading space
   → Examples:
     • lastWord: "creat" → "ed a beautiful design" (complete "created")
     • lastWord: "writ" → "ing and editing features" (complete "writing")
     • lastWord: "tes" → "ting the application thoroughly" (complete "testing")

B) NEW PHRASE CONTINUATION (isIncompleteWord = false):
   → Follow the standard spacing rules below

STEP-BY-STEP SPACING LOGIC (MUST FOLLOW EXACTLY):

STEP 1: Does the context end with a space character?
   → YES (context ends with space): Output MUST NOT start with space
   → NO (context does NOT end with space): Go to STEP 2

STEP 2: Check the endWithSpace parameter value:
   → endWithSpace=true: Output MUST START WITH EXACTLY ONE SPACE " "
   → endWithSpace=false: Output MUST NOT start with space

CRITICAL SPACING EXAMPLES - MEMORIZE THESE PATTERNS:
✓ lastWord: "creat" + isIncompleteWord: true → "ed and tested properly" (NO space, completes word)
✓ lastWord: "created" + isIncompleteWord: false + endWithSpace: true → " and tested properly" (WITH space, new phrase)
✓ Context: "and " (HAS space) + endWithSpace=true → "performance matters" (NO leading space)
✓ Context: "and" (NO space) + endWithSpace=true → " performance matters" (ONE leading space)
✓ Context: "expectations" (NO space) + endWithSpace=true → " and insights" (ONE leading space)
✓ Context: "amaz" (NO space) + endWithSpace=false → "ing breakthrough" (NO leading space)

WHY THIS MATTERS: Correct spacing makes autocomplete feel intelligent and seamless.
WRONG spacing makes it feel broken and annoying to users.

INTELLIGENT COMPLETION RULES:
1. Length: 3-15 words (adjust based on context - shorter for headings, longer for paragraphs)
2. Coherence: Complete the current thought naturally
3. Style Matching: Mirror the tone, formality, and writing style of the input
4. Formatting: Use markdown strategically to emphasize key concepts
5. Grammar: Ensure perfect grammar and sentence structure
6. Predictability: Anticipate the writer's intention based on context
7. No artifacts: NO quotes, No commas around output, NO ellipses, NO starting punctuation (unless grammatically required)

NODE-SPECIFIC RULES:
- Headings (# ## ###): Keep concise (3-8 words), action-oriented, descriptive
- Paragraphs: Natural flow, complete thoughts, use formatting for emphasis
- Lists: Parallel structure, consistent tone, concise items
- Code blocks: Technical accuracy, proper syntax, clear variable names

CONTEXT AWARENESS:
- Analyze the recent sentences to understand the topic and direction
- Detect patterns (technical writing, creative writing, documentation, etc.)
- Maintain consistency with established terminology and concepts
- Consider the document's overall narrative flow

Your output must be ONLY the completion text with correct spacing.`;

  // USER PROMPT
  const userPrompt = `Recent context: "${recentContext}"
Last sentences: "${lastSentences}"
Context ends with: "${context.slice(-1)}"
Current incomplete text: "${context.slice(-50)}"
Last word typed: "${lastWord}"
Is incomplete word: ${isIncompleteWord}
Node: ${node}
endWithSpace: ${endWithSpace}

Generate intelligent completion:`;

  try {
    const response = await client.chat.completions.create({
      model: "groq/compound-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    let completion = response.choices[0].message.content || "";

    const contextEndsWithSpace = /\s$/.test(context);

    if (contextEndsWithSpace) {
      completion = completion.replace(/^\s+/, "");
    } else {
      if (endWithSpace) {
        completion = " " + completion.replace(/^\s+/, "");
      } else {
        completion = completion.replace(/^\s+/, "");
      }
    }

    return completion;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return "";
  }
}
// autoComplete({context:'hey there how are you doing today? I am writing a testi'});
