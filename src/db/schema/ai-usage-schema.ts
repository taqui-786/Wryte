// import { agentChat } from "@/db/schema/agent-schema";
// import { docs, user } from "@/db/schema/auth-schema";
// import {
//   index,
//   integer,
//   pgTable,
//   text,
//   timestamp,
//   uuid,
// } from "drizzle-orm/pg-core";

// export const aiUsageLogs = pgTable(
//   "ai_usage_logs",
//   {
//     id: uuid("id").primaryKey().defaultRandom(),
//     userId: text("user_id")
//       .notNull()
//       .references(() => user.id, { onDelete: "cascade" }),
//     feature: text("feature").notNull(),
//     model: text("model").notNull(),
//     agentChatId: uuid("agent_chat_id").references(() => agentChat.id, {
//       onDelete: "set null",
//     }),
//     docId: uuid("doc_id").references(() => docs.id, { onDelete: "set null" }),
//     promptTokens: integer("prompt_tokens").notNull().default(0),
//     completionTokens: integer("completion_tokens").notNull().default(0),
//     totalTokens: integer("total_tokens").notNull().default(0),
//     requestCount: integer("request_count").notNull().default(1),
//     createdAt: timestamp("created_at").defaultNow().notNull(),
//   },
//   (table) => [
//     index("ai_usage_logs_user_created_idx").on(table.userId, table.createdAt),
//     index("ai_usage_logs_user_model_created_idx").on(
//       table.userId,
//       table.model,
//       table.createdAt,
//     ),
//     index("ai_usage_logs_user_feature_created_idx").on(
//       table.userId,
//       table.feature,
//       table.createdAt,
//     ),
//   ],
// );

// export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
// export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;
