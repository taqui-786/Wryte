import type {
  AIMessageResponse,
  AiMessageStreaming,
} from "@/components/agent/agent-sidebar/types";

export function updateLastAiMessage(
  messages: AIMessageResponse,
  chunk: AiMessageStreaming,
): AIMessageResponse {
  if (messages.length === 0) return messages;

  const updated = [...messages];
  const last = updated[updated.length - 1];
  if (last.type !== "ai") return messages;

  const data = { ...last.data };
  data.content =
    (data.content || "") + (chunk.type !== "tool" ? chunk.content : "");

  if (chunk.type === "AIMessageChunk") {
    data.additional_kwargs = {
      ...data.additional_kwargs,
      reasoning:
        (data.additional_kwargs.reasoning || "") +
        (chunk.additional_kwargs?.reasoning || ""),
      reasoning_content:
        (data.additional_kwargs.reasoning_content || "") +
        (chunk.additional_kwargs?.reasoning_content || ""),
    };

    for (const tc of chunk.tool_calls) {
      if (!data.tool_calls.some((t) => t.id === tc.id)) {
        data.tool_calls = [...data.tool_calls, tc];
      }
    }

    if (chunk.usage_metadata) {
      data.usage_metadata = chunk.usage_metadata;
    }

    if (chunk.response_metadata?.finish_reason) {
      data.response_metadata = {
        ...data.response_metadata,
        ...chunk.response_metadata,
      };
    }
  }

  const parts: { type: string; text: string; state?: string }[] = [];
  const reasoning = data.additional_kwargs?.reasoning;
  if (reasoning?.trim()) {
    parts.push({ type: "reasoning", text: reasoning, state: "streaming" });
  }
  if (data.content?.trim()) {
    parts.push({ type: "text", text: data.content });
  }

  updated[updated.length - 1] = { ...last, data, parts };
  return updated;
}
