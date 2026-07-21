import {
  AIMessage,
  AIMessageResponse,
  HumanMessage,
} from "./types";

function hasParts(msg: HumanMessage | AIMessage) {
  return Array.isArray((msg as any).parts) && (msg as any).parts.length > 0;
}

export function normalizeThreadMessages(messages: AIMessageResponse): AIMessageResponse {
  return messages.map((msg) => {
    if (hasParts(msg)) return msg;

    const parts: any[] = [];

    if (msg.type === "human") {
      if (msg.data.content) {
        parts.push({ type: "text", text: msg.data.content });
      }
    } else if (msg.type === "ai") {
      const reasoning =
        msg.data.additional_kwargs?.reasoning_content ||
        msg.data.additional_kwargs?.reasoning;
      if (reasoning) {
        parts.push({ type: "reasoning", text: reasoning, state: "done" });
      }
      if (msg.data.content) {
        parts.push({ type: "text", text: msg.data.content });
      }

    }

    return { ...msg, parts };
  });
}
