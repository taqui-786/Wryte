import { aiUsageLogs } from "@/db/schema/ai-usage-schema";
import { db } from "@/db/dbConnect";
import {
  AI_USAGE_LIMITS,
  FEATURE_BUCKET,
  type UsageFeature,
  type UsageModel,
} from "@/lib/ai-usage-limits";
import { and, eq, gte, lt, sql } from "drizzle-orm";

type UsageValue = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
};

const toSafeInt = (value: unknown) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const getUtcDayBounds = () => {
  const now = new Date();
  const dayStartUtc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const resetAt = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
  return { dayStartUtc, resetAt };
};

const normalizeUsage = (usage?: UsageValue) => {
  const promptTokens = toSafeInt(usage?.promptTokens ?? usage?.inputTokens);
  const completionTokens = toSafeInt(
    usage?.completionTokens ?? usage?.outputTokens,
  );
  const totalFromUsage = toSafeInt(usage?.totalTokens);
  const totalTokens =
    totalFromUsage > 0 ? totalFromUsage : promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
};

export async function checkAiRateLimit(userId: string, feature: UsageFeature) {
  const bucket = FEATURE_BUCKET[feature];
  const { dayStartUtc, resetAt } = getUtcDayBounds();

  const [totals] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
      totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        eq(aiUsageLogs.model, bucket.model),
        gte(aiUsageLogs.createdAt, dayStartUtc),
        lt(aiUsageLogs.createdAt, resetAt),
      ),
    );

  const usedTokens = toSafeInt(totals?.totalTokens);
  const usedRequests = toSafeInt(totals?.totalRequests);

  const remainingTokens = Math.max(bucket.dailyTokens - usedTokens, 0);
  const remainingRequests = Math.max(bucket.dailyRequests - usedRequests, 0);

  return {
    allowed: remainingTokens > 0 && remainingRequests > 0,
    remaining: { tokens: remainingTokens, requests: remainingRequests },
    resetAt,
    used: { tokens: usedTokens, requests: usedRequests },
  };
}

export async function recordAiUsage(params: {
  userId: string;
  feature: UsageFeature;
  model: UsageModel;
  agentChatId?: string;
  docId?: string;
  usage?: UsageValue;
}) {
  const usage = normalizeUsage(params.usage);

  await db.insert(aiUsageLogs).values({
    userId: params.userId,
    feature: params.feature,
    model: params.model,
    agentChatId: params.agentChatId,
    docId: params.docId,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    requestCount: 1,
  });
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

export const MODEL_DAILY_LIMITS = {
  "openai/gpt-oss-120b": AI_USAGE_LIMITS.AGENT_CHAT,
  "openai/gpt-oss-20b": AI_USAGE_LIMITS.AUTOCOMPLETE,
} as const satisfies Record<
  UsageModel,
  { dailyTokens: number; dailyRequests: number }
>;
