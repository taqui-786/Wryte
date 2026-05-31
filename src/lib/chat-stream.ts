"use client";

import type { AiMessageStreaming } from "@/components/agent/agent-sidebar/types";

export type ChatStreamBody = {
  message: string;
  thread_id: string;
  user_id: string;
};

export type ChatStreamCallbacks = {
  onChunk: (chunk: AiMessageStreaming) => void;
  onDone: () => void;
};

const DEFAULT_URL =
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`;

export async function readChatStream(
  body: ChatStreamBody,
  callbacks: ChatStreamCallbacks,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const url = DEFAULT_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chat stream failed (${res.status}): ${text}`);
  }
  if (!res.body) throw new Error("Response body is null");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
        callbacks.onDone();
        return;
      }

      try {
        callbacks.onChunk(JSON.parse(payload));
      } catch {
        // skip malformed JSON lines
      }
    }
  }

  callbacks.onDone();
}
