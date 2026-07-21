import { MODEL_DAILY_LIMITS } from "@/lib/ai-rate-limiter";
import {
  FEATURE_BUCKET,
  type UsageFeature,
  type UsageModel,
} from "@/lib/ai-usage-limits";

// ---------------------------------------------------------------------------
// DB-driven usage stats removed. Returns static zero-value data so the
// settings page continues to render with all UI intact.
// ---------------------------------------------------------------------------

export async function getUsageStatsQuery() {
  const resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const toFeatureCard = (feature: UsageFeature) => {
    const bucket = FEATURE_BUCKET[feature];
    return {
      feature,
      model: bucket.model,
      usedTokens: 0,
      usedRequests: 0,
      dailyTokens: bucket.dailyTokens,
      dailyRequests: bucket.dailyRequests,
      remainingTokens: bucket.dailyTokens,
      remainingRequests: bucket.dailyRequests,
      resetAt,
    };
  };

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return {
      date: date.toISOString().slice(0, 10),
      tokens: 0,
      requests: 0,
    };
  });

  return {
    resetAt,
    today: {
      agentChat: toFeatureCard("agent_chat"),
      autocomplete: toFeatureCard("autocomplete"),
      editorTransform: toFeatureCard("editor_transform"),
    },
    modelBreakdown: (Object.keys(MODEL_DAILY_LIMITS) as UsageModel[]).map(
      (model) => {
        const limit = MODEL_DAILY_LIMITS[model];
        return {
          model,
          usedTokens: 0,
          usedRequests: 0,
          dailyTokens: limit.dailyTokens,
          dailyRequests: limit.dailyRequests,
          remainingTokens: limit.dailyTokens,
          remainingRequests: limit.dailyRequests,
        };
      },
    ),
    weekly,
    perChat: [] as Array<{ chatId: string; title: string; tokens: number; requests: number }>,

  };
}
