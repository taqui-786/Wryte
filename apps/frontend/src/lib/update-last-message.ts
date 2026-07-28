import type {
  AIMessageResponse,
  AiMessageStreaming,
  ContentBlock,
  StreamingPart,
} from "@/components/agent/agent-sidebar/types";

function extractText(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

function hasReasoningBlock(content: string | ContentBlock[]): boolean {
  return Array.isArray(content) && content.some((b) => b.type === "reasoning");
}

export function updateLastAiMessage(
  messages: AIMessageResponse,
  chunk: AiMessageStreaming,
): AIMessageResponse {
  if (messages.length === 0) return messages;

  const updated = [...messages];
  const last = updated[updated.length - 1];
  if (last.type !== "ai") return messages;

  const data = { ...last.data };

  if (chunk.message.type === "AIMessageChunk") {
    const text = extractText(chunk.message.content);

    data.content = (data.content || "") + text;

    const isReasoning =
      hasReasoningBlock(chunk.message.content) ||
      (chunk.message.additional_kwargs?.reasoning ? true : false);

    data.additional_kwargs = {
      ...data.additional_kwargs,
      isReasoning,
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
      data.usage_metadata = {
        ...chunk.message.usage_metadata,
        input_token_details: chunk.message.usage_metadata.input_token_details,
        output_token_details: chunk.message.usage_metadata.output_token_details,
      };
    }

    if (chunk.message.response_metadata) {
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
