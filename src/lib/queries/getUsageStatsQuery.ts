import { aiUsageLogs } from "@/db/schema/ai-usage-schema";
import { agentChat } from "@/db/schema/agent-schema";
import { db } from "@/db/dbConnect";
import { MODEL_DAILY_LIMITS } from "@/lib/ai-rate-limiter";
import {
  FEATURE_BUCKET,
  type UsageFeature,
  type UsageModel,
} from "@/lib/ai-usage-limits";
import { getServerUserSession } from "@/lib/serverAction";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

const toSafeInt = (value: unknown) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const getUtcBounds = () => {
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
  const sevenDayStartUtc = new Date(
    dayStartUtc.getTime() - 6 * 24 * 60 * 60 * 1000,
  );
  return { dayStartUtc, resetAt, sevenDayStartUtc };
};

const utcDateKey = (date: Date) => date.toISOString().slice(0, 10);

export async function getUsageStatsQuery() {
  const session = await getServerUserSession();
  if (!session) {
    return null;
  }

  const userId = session.user.id;
  const { dayStartUtc, resetAt, sevenDayStartUtc } = getUtcBounds();
  const dayKeyExpr = sql<string>`to_char(date_trunc('day', ${aiUsageLogs.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

  const [todayFeatureRows, todayModelRows, weeklyRows, perChatRows] =
    await Promise.all([
      db
        .select({
          feature: aiUsageLogs.feature,
          model: aiUsageLogs.model,
          totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
          totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)`,
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.userId, userId),
            gte(aiUsageLogs.createdAt, dayStartUtc),
            lt(aiUsageLogs.createdAt, resetAt),
          ),
        )
        .groupBy(aiUsageLogs.feature, aiUsageLogs.model),
      db
        .select({
          model: aiUsageLogs.model,
          totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
          totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)`,
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.userId, userId),
            gte(aiUsageLogs.createdAt, dayStartUtc),
            lt(aiUsageLogs.createdAt, resetAt),
          ),
        )
        .groupBy(aiUsageLogs.model),
      db
        .select({
          day: dayKeyExpr,
          totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
          totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)`,
        })
        .from(aiUsageLogs)
        .where(
          and(
            eq(aiUsageLogs.userId, userId),
            gte(aiUsageLogs.createdAt, sevenDayStartUtc),
            lt(aiUsageLogs.createdAt, resetAt),
          ),
        )
        .groupBy(dayKeyExpr)
        .orderBy(dayKeyExpr),
      db
        .select({
          chatId: aiUsageLogs.agentChatId,
          title: agentChat.title,
          totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`,
          totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)`,
        })
        .from(aiUsageLogs)
        .leftJoin(agentChat, eq(aiUsageLogs.agentChatId, agentChat.id))
        .where(
          and(
            eq(aiUsageLogs.userId, userId),
            eq(aiUsageLogs.feature, "agent_chat"),
            gte(aiUsageLogs.createdAt, dayStartUtc),
            lt(aiUsageLogs.createdAt, resetAt),
          ),
        )
        .groupBy(aiUsageLogs.agentChatId, agentChat.title)
        .orderBy(desc(sql`coalesce(sum(${aiUsageLogs.totalTokens}), 0)`)),
    ]);

  const featureTotals = new Map<
    UsageFeature,
    { model: UsageModel; tokens: number; requests: number }
  >();

  for (const row of todayFeatureRows) {
    const feature = row.feature as UsageFeature;
    const model = row.model as UsageModel;
    featureTotals.set(feature, {
      model,
      tokens: toSafeInt(row.totalTokens),
      requests: toSafeInt(row.totalRequests),
    });
  }

  const toFeatureCard = (feature: UsageFeature) => {
    const bucket = FEATURE_BUCKET[feature];
    const used = featureTotals.get(feature) ?? {
      model: bucket.model,
      tokens: 0,
      requests: 0,
    };

    return {
      feature,
      model: used.model,
      usedTokens: used.tokens,
      usedRequests: used.requests,
      dailyTokens: bucket.dailyTokens,
      dailyRequests: bucket.dailyRequests,
      remainingTokens: Math.max(bucket.dailyTokens - used.tokens, 0),
      remainingRequests: Math.max(bucket.dailyRequests - used.requests, 0),
      resetAt,
    };
  };

  const weeklyMap = new Map(
    weeklyRows.map((row) => [
      row.day,
      {
        tokens: toSafeInt(row.totalTokens),
        requests: toSafeInt(row.totalRequests),
      },
    ]),
  );

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      sevenDayStartUtc.getTime() + index * 24 * 60 * 60 * 1000,
    );
    const key = utcDateKey(date);
    const value = weeklyMap.get(key);
    return {
      date: key,
      tokens: value?.tokens ?? 0,
      requests: value?.requests ?? 0,
    };
  });

  const modelTotals = new Map(
    todayModelRows.map((row) => [
      row.model as UsageModel,
      {
        usedTokens: toSafeInt(row.totalTokens),
        usedRequests: toSafeInt(row.totalRequests),
      },
    ]),
  );

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
        const totals = modelTotals.get(model);
        const usedTokens = totals?.usedTokens ?? 0;
        const usedRequests = totals?.usedRequests ?? 0;
        return {
          model,
          usedTokens,
          usedRequests,
          dailyTokens: limit.dailyTokens,
          dailyRequests: limit.dailyRequests,
          remainingTokens: Math.max(limit.dailyTokens - usedTokens, 0),
          remainingRequests: Math.max(limit.dailyRequests - usedRequests, 0),
        };
      },
    ),
    weekly,
    perChat: perChatRows
      .filter((row) => Boolean(row.chatId))
      .map((row) => ({
        chatId: row.chatId as string,
        title: row.title?.trim() || "Untitled chat",
        tokens: toSafeInt(row.totalTokens),
        requests: toSafeInt(row.totalRequests),
      })),
  };
}
