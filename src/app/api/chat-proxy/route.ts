import { auth } from "@/lib/auth";
import { buildRateLimitExceededPayload, checkAiRateLimit } from "@/lib/ai-rate-limiter";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return Response.json(
      { error: "UNAUTHORIZED", message: "Unauthorized" },
      { status: 401 },
    );
  }

  // const limit = await checkAiRateLimit(session.user.id, "agent_chat");
  // if (!limit.allowed) {
  //   return Response.json(buildRateLimitExceededPayload("agent_chat", limit), {
  //     status: 429,
  //   });
  // }

  const { message, thread_id }: { message: string; thread_id: string } =
    await req.json();

  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id, user_id: session.user.id }),
  });

  if (!res.ok || !res.body) {
    return Response.json(
      { error: "Backend error", status: res.status },
      { status: res.status },
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);
          if (payload === "DONE") {
            controller.close();
            return;
          }

          try {
            controller.enqueue(new TextEncoder().encode(payload + "\n"));
          } catch {
            // skip malformed JSON chunks
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
