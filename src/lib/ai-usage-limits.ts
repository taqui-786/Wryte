export const AI_USAGE_LIMITS = {
  AGENT_CHAT: {
    model: "openai/gpt-oss-120b",
    dailyTokens: 16000,
    dailyRequests: 80,
  },
  AUTOCOMPLETE: {
    model: "openai/gpt-oss-20b",
    dailyTokens: 16000,
    dailyRequests: 80,
  },
  EDITOR_TRANSFORM: {
    model: "openai/gpt-oss-20b",
    dailyTokens: 16000,
    dailyRequests: 80,
  },
} as const;

export type UsageFeature = "agent_chat" | "autocomplete" | "editor_transform";
export type UsageModel = "openai/gpt-oss-120b" | "openai/gpt-oss-20b";

export const FEATURE_BUCKET = {
  agent_chat: AI_USAGE_LIMITS.AGENT_CHAT,
  autocomplete: AI_USAGE_LIMITS.AUTOCOMPLETE,
  editor_transform: AI_USAGE_LIMITS.EDITOR_TRANSFORM,
} as const satisfies Record<
  UsageFeature,
  {
    model: UsageModel;
    dailyTokens: number;
    dailyRequests: number;
  }
>;
