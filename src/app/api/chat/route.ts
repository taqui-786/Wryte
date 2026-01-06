import { groq } from "@ai-sdk/groq";
import { UIMessage, convertToModelMessages, streamText } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const stream = streamText({
    model: groq("openai/gpt-oss-20b"),
    system: `You are Wryte, a helpful AI assistant.
Provide clear, accurate, and well-structured responses.
Be concise but comprehensive when answering questions.`,

    messages: await convertToModelMessages(messages),
  });

  return stream.toUIMessageStreamResponse();
}
