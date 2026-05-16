import type { UsageFeature, UsageModel } from "@/lib/ai-usage-limits";

// ---------------------------------------------------------------------------
// DB-driven rate-limiting has been removed.
// checkAiRateLimit always returns "allowed" so AI features keep working.
// recordAiUsage is a no-op so nothing crashes at the call-sites.
// ---------------------------------------------------------------------------

type UsageValue = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export async function checkAiRateLimit(
  _userId: string,
  _feature: UsageFeature,
) {
  return {
    allowed: true,
    remaining: { tokens: 999_999, requests: 9_999 },
    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    used: { tokens: 0, requests: 0 },
  };
}

export async function recordAiUsage(_params: {
  userId: string;
  feature: UsageFeature;
  model: UsageModel;
  agentChatId?: string;
  docId?: string;
  usage?: UsageValue;
}): Promise<void> {
  // no-op
}

export function buildRateLimitExceededPayload(
  feature: UsageFeature,
  limitResult: Awaited<ReturnType<typeof checkAiRateLimit>>,
) {
  return {
    error: "RATE_LIMIT_EXCEEDED" as const,
    feature,
    message:
      "You've reached your daily AI limit for this feature. Resets at midnight UTC.",
    resetAt: limitResult.resetAt.toISOString(),
    remaining: limitResult.remaining,
  };
}

import { AI_USAGE_LIMITS } from "@/lib/ai-usage-limits";

export const MODEL_DAILY_LIMITS = {
  "openai/gpt-oss-120b": AI_USAGE_LIMITS.AGENT_CHAT,
  "openai/gpt-oss-20b": AI_USAGE_LIMITS.AUTOCOMPLETE,
} as const satisfies Record<
  UsageModel,
  { dailyTokens: number; dailyRequests: number }
>;
