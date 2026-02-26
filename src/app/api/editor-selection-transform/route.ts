import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

type TransformAction = "shorten" | "expand";

type EditorSelectionTransformBody = {
  action?: TransformAction;
  text?: string;
};

const sanitizeOutput = (text: string) =>
  text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^<think>[\s\S]*$/gi, "")
    .trim();

const actionInstruction = (action: TransformAction) => {
  if (action === "shorten") {
    return "Create a concise version of the input while keeping the original meaning, voice, and pacing.";
  }

  return "Add thoughtful, relevant detail to the input while keeping the original meaning, voice, and pacing.";
};

const toneGuidelines = `
Tone: Mirror the exact voice, mood, and sentence rhythm of the provided text.
Strictly never use this '—' symbol.
Humanize the language—stay grounded, conversational, and clear.
Avoid mentioning AI, “context,” or similar framing statements.
If you include bullet points, use a single short dash "-" per item.
Do not use emojis or decorative characters.
Always return only the rewritten text, no explanation or metadata.
`.trim();

export async function POST(req: Request) {
  try {
    const { action, text }: EditorSelectionTransformBody = await req.json();

    if (!action || (action !== "shorten" && action !== "expand")) {
      return new Response("Invalid action", { status: 400 });
    }

    if (!text?.trim()) {
      return new Response("Missing text", { status: 400 });
    }

    const result = await generateText({
      model: groq("moonshotai/kimi-k2-instruct-0905"),
      system:
        "You are a precise writing editor for markdown documents. Return only transformed text without commentary.",
      prompt: `${actionInstruction(action)}\n\n${toneGuidelines}\n\nInput:\n${text}`,
      temperature: 0.4,
      maxOutputTokens: 800,
    });

    const transformed = sanitizeOutput(result.text ?? "");

    if (!transformed) {
      return new Response("Empty transform output", { status: 502 });
    }

    return Response.json({
      text: transformed,
    });
  } catch (error) {
    console.error("Editor selection transform API error:", error);
    return new Response("Failed to transform selection", { status: 500 });
  }
}
