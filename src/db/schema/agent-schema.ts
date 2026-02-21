import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { docs, user } from "./auth-schema";

// npx drizzle-kit generate  -- generate migration
// npx drizzle-kit migrate   -- apply migration

/**
 * One chat session per document per user.
 * Conversations are scoped to a doc so each doc has its own history.
 */
export const agentChat = pgTable("agent_chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  docId: uuid("doc_id")
    .notNull()
    .references(() => docs.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Each row is one UIMessage (user or assistant).
 * `parts` stores the full MyUIMessage object as JSONB so the entire
 * message (including streaming parts, tool calls, data-* events) is
 * round-tripped without any information loss.
 */
export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentChatId: uuid("agent_chat_id")
    .notNull()
    .references(() => agentChat.id, { onDelete: "cascade" }),

  /** Client-side message ID from useChat (e.g. "msg_abc123") */
  messageId: text("message_id").notNull(),

  /** "user" | "assistant" */
  role: text("role").notNull(),

  /**
   * The full serialised MyUIMessage object.
   * Type: MyUIMessage (from src/app/api/chat/route.ts)
   */
  parts: jsonb("parts").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type AgentChat = typeof agentChat.$inferSelect;
export type NewAgentChat = typeof agentChat.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
