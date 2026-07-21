import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import {
  buildRateLimitExceededPayload,
  checkAiRateLimit,
  recordAiUsage,
} from "@/lib/ai-rate-limiter";

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
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return Response.json(
        { error: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const limit = await checkAiRateLimit(session.user.id, "editor_transform");
    if (!limit.allowed) {
      return Response.json(
        buildRateLimitExceededPayload("editor_transform", limit),
        { status: 429 },
      );
    }

    const { action, text }: EditorSelectionTransformBody = await req.json();

    if (!action || (action !== "shorten" && action !== "expand")) {
      return new Response("Invalid action", { status: 400 });
    }

    if (!text?.trim()) {
      return new Response("Missing text", { status: 400 });
    }

    const result = await generateText({
      model: groq("openai/gpt-oss-20b"),
      system:
        "You are a precise writing editor for markdown documents. Return only transformed text without commentary.",
      prompt: `${actionInstruction(action)}\n\n${toneGuidelines}\n\nInput:\n${text}`,
      temperature: 0.4,
      maxOutputTokens: 800,
    });

    try {
      await recordAiUsage({
        userId: session.user.id,
        feature: "editor_transform",
        model: "openai/gpt-oss-20b",
        usage: result.usage,
      });
    } catch (error) {
      console.error("Failed to record selection transform usage:", error);
    }

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
