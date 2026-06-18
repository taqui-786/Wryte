export type AIMessageResponse = Array<HumanMessage | AIMessage>;

type PreNode = "classify" | "recall" | "remember" | "planner" | "step_dispatecher" | "step_complete"
type ChatNode = "chat_node" | "tools"
type ResearchNode = "research_topics" | "research" | "finalize_research" | "research_answer"
type WriterNode = "writer_planning_node" | "write_content" | "humanize"

export type NodeType = PreNode | ChatNode | ResearchNode | WriterNode
export interface BaseMessage {
  type: "human" | "ai";
  data: {
    content: string;
    additional_kwargs: Record<string, unknown>;
    response_metadata: Record<string, unknown>;
    type: "human" | "ai";
    name: string | null;
    id: string;
  };
  parts?: any[];
}

export interface HumanMessage extends BaseMessage {
  type: "human";

  data: BaseMessage["data"] & {
    type: "human";
  };
}

export interface AIMessage extends BaseMessage {
  type: "ai";

  data: BaseMessage["data"] & {
    type: "ai";

    additional_kwargs: {
      reasoning_content?: string;
      isReasoning?: Boolean;
      reasoning?: string;
      _reasoning_api_fields?: string[];
      [key: string]: unknown;
    };

    response_metadata: {
      finish_reason: "stop" | "tool_calls" | string;
      model_name: string;
      [key: string]: unknown;
    };

    tool_calls: ToolCall[];
    invalid_tool_calls: unknown[];

    usage_metadata: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
  isRunning?: boolean;
}

export type StreamingPart = ReasoningPart | ContentPart | ToolCallPart;

export interface ReasoningPart {
  type: "reasoning";
  content: string;
}

export interface ContentPart {
  type: "content";
  content: string;
}

export interface ToolCallPart {
  type: "tool_call";
  toolCall: ToolCall;
}

export type AiMessageStreaming = {
  node: NodeType;
  message: AIMessageChunkStream | ToolMessageStream;
};

export interface AIMessageChunkStream {
  type: "AIMessageChunk";
  content: string;
  additional_kwargs: {
    reasoning_content?: string;
    reasoning?: string;
    _reasoning_api_fields?: string[];
    [key: string]: unknown;
  };
  response_metadata: {
    finish_reason?: string;
    model_name?: string;
    [key: string]: unknown;
  };
  name: string | null;
  id: string;
  tool_calls: ToolCall[];
  invalid_tool_calls: unknown[];
  usage_metadata: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  } | null;
  tool_call_chunks: {
    name: string;
    args: string;
    id: string;
    index: number;
    type: "tool_call_chunk";
  }[];
  chunk_position: string | null;
  role: "assistant";
}

export interface ToolMessageStream {
  type: "tool";
  content: string;
  additional_kwargs: Record<string, unknown>;
  response_metadata: Record<string, unknown>;
  name: string;
  id: string;
  tool_call_id: string;
  artifact: unknown;
  status: string;
}
