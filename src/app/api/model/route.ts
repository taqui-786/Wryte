import { chat, toServerSentEventsStream } from "@tanstack/ai";
import { geminiText } from "@tanstack/ai-gemini";

// Define the response schema as JSON Schema for Gemini API
// Uses plain JSON Schema format supported by Gemini
const responseJsonSchema = {
  type: "object" as const,
  properties: {
    message: {
      type: "string" as const,
      description: "The assistant's response message",
    },
  },
  required: ["message"],
};

export async function POST(request: Request) {
  const { messages, conversationId } = await request.json();

  try {
    // Create a streaming chat response
    const stream = (await chat({
      adapter: geminiText("gemini-2.5-flash"),
      messages,
      modelOptions: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 4000,
        },
        responseMimeType: "application/json",
        responseJsonSchema: responseJsonSchema as any,
      },
    })) as any;

    const readableStream = toServerSentEventsStream(stream);
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
