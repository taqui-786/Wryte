import type {
  AIMessageResponse,
  AiMessageStreaming,
  StreamingPart,
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
    (data.content || "") +
    (chunk.message.type !== "tool" ? chunk.message.content : "");

  if (chunk.message.type === "AIMessageChunk") {
    data.additional_kwargs = {
      ...data.additional_kwargs,
      isReasoning: chunk.message.additional_kwargs?.reasoning ? true : false,
      reasoning:
        (data.additional_kwargs.reasoning || "") +
        (chunk.message.additional_kwargs?.reasoning || ""),
      reasoning_content:
        (data.additional_kwargs.reasoning_content || "") +
        (chunk.message.additional_kwargs?.reasoning_content || ""),
    };

    for (const tc of chunk.message.tool_calls) {
      if (!data.tool_calls.some((t) => t.id === tc.id)) {
        data.tool_calls = [
          ...data.tool_calls,
          {
            ...tc,
            isRunning: true,
          },
        ];
      }
    }

    if (chunk.message.usage_metadata) {
      data.usage_metadata = chunk.message.usage_metadata;
    }

    if (chunk.message.response_metadata?.finish_reason) {
      data.response_metadata = {
        ...data.response_metadata,
        ...chunk.message.response_metadata,
      };
    }
  } else if (chunk.message.type === "tool") {
    for (const tc of data.tool_calls) {
      if (
        tc.name === chunk.message.name &&
        tc.id === chunk.message.tool_call_id
      ) {
        console.log(tc.name, "Completed");

        tc.isRunning = false;
      }
    }
  }

  const parts: StreamingPart[] = [];
  const reasoning = data.additional_kwargs?.reasoning_content;
  if (reasoning?.trim()) {
    parts.push({ type: "reasoning", content: reasoning });
  }
  if (data.content?.trim()) {
    parts.push({ type: "content", content: data.content });
  }
  for (const tc of data.tool_calls) {
    parts.push({ type: "tool_call", toolCall: tc });
  }

  updated[updated.length - 1] = { ...last, data, parts };
  return updated;
}
