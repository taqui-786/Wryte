"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/db/dbConnect";
import { docs } from "@/db/schema/auth-schema";
import { agentChat, agentMessages } from "@/db/schema/agent-schema";
import { and, eq, asc, desc } from "drizzle-orm";
import { CreateDocSchema, UpdateDocSchema } from "./zodValidations";
import { cache } from "react";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string,
});

export const getServerUserSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

const testing = async () => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: "Robot holding a red skateboard",
  });

  console.log(response);
};
// testing()

export const getUserDocs = async () => {
  const session = await getServerUserSession();
  const response = await db
    .select({
      id: docs.id,
      title: docs.title,
      content: docs.content,
    })
    .from(docs)
    .where(eq(docs.userId, session?.user.id as string));
  return response;
};
export const getDocsById = async (id: string) => {
  const session = await getServerUserSession();
  if (!session || !id) {
    return [];
  }
  const response = await db
    .select({
      id: docs.id,
      title: docs.title,
      content: docs.content,
      updatedAt: docs.updatedAt,
    })
    .from(docs)
    .where(
      and(
        eq(docs.userId, session?.user.id as string),
        eq(docs.id, id as string),
      ),
    );
  return response;
};
export const createUserDocs = async (payload: CreateDocSchema) => {
  const session = await getServerUserSession();
  if (!session) throw new Error("Unauthorized");
  const response = await db
    .insert(docs)
    .values({
      userId: session.user.id,
      title: payload.title,
      content: payload.content || "",
    })
    .returning();
  return response[0];
};
export const updateUserDocs = async (payload: UpdateDocSchema) => {
  const session = await getServerUserSession();

  if (!session) throw new Error("Unauthorized");
  const res = await db
    .update(docs)
    .set({
      title: payload.title,
      content: payload.content,
    })
    .where(eq(docs.id, payload.docId))
    .returning();
  return res[0];
};
export const deleteUserDocs = async (docId: string) => {
  const session = await getServerUserSession();
  if (!session) throw new Error("Unauthorized");
  const response = await db
    .delete(docs)
    .where(and(eq(docs.id, docId), eq(docs.userId, session.user.id)))
    .returning();
  return response[0];
};
export async function getCoordinates(location: string) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      location,
    )}&count=1`,
  );

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found");
  }

  const place = data.results[0];

  return {
    latitude: place.latitude,
    longitude: place.longitude,
    name: place.name,
    country: place.country,
  };
}
export async function getWeather(lat: number, lon: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
  );

  const data = await res.json();
  return data.current_weather;
}

/**
 * Get all agent chats for a document (for history panel).
 * Returns chats ordered by most recently updated.
 */
export const getAllAgentChats = async (docId: string) => {
  const session = await getServerUserSession();
  if (!session) return [];

  const chats = await db
    .select({
      id: agentChat.id,
      title: agentChat.title,
      createdAt: agentChat.createdAt,
      updatedAt: agentChat.updatedAt,
    })
    .from(agentChat)
    .where(
      and(eq(agentChat.docId, docId), eq(agentChat.userId, session.user.id)),
    )
    .orderBy(desc(agentChat.updatedAt));

  return chats;
};

/**
 * Get messages for a specific chat.
 */
export const getAgentChatMessages = async (chatId: string) => {
  const session = await getServerUserSession();
  if (!session) return null;

  // Verify the chat belongs to this user
  const chat = await db.query.agentChat.findFirst({
    where: and(eq(agentChat.id, chatId), eq(agentChat.userId, session.user.id)),
  });

  if (!chat) return null;

  const messages = await db.query.agentMessages.findMany({
    where: eq(agentMessages.agentChatId, chatId),
    orderBy: asc(agentMessages.createdAt),
  });

  return {
    chatId: chat.id,
    title: chat.title,
    messages,
  };
};

/**
 * Create a new agent chat for a document.
 */
export const createAgentChat = async (docId: string) => {
  const session = await getServerUserSession();
  if (!session) throw new Error("Unauthorized");

  const [chat] = await db
    .insert(agentChat)
    .values({
      userId: session.user.id,
      docId,
      title: "",
      status: "active",
    })
    .returning();

  return chat;
};

/**
 * Save messages for a chat.
 * Uses full-replace strategy: deletes all existing messages and re-inserts.
 * Also auto-generates a title from the first user message if the chat has no title.
 */
export const saveAgentMessages = async (
  chatId: string,
  messages: Array<{ id: string; role: string; parts: unknown }>,
) => {
  const session = await getServerUserSession();
  if (!session) throw new Error("Unauthorized");

  // Verify chat ownership
  const chat = await db.query.agentChat.findFirst({
    where: and(eq(agentChat.id, chatId), eq(agentChat.userId, session.user.id)),
  });

  if (!chat) throw new Error("Chat not found");

  // Delete existing messages and re-insert
  await db.delete(agentMessages).where(eq(agentMessages.agentChatId, chatId));

  if (messages.length > 0) {
    await db.insert(agentMessages).values(
      messages.map((msg) => ({
        agentChatId: chatId,
        messageId: msg.id,
        role: msg.role,
        parts: msg.parts,
      })),
    );
  }

  // Auto-generate title if empty
  if (!chat.title) {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      try {
        const userText =
          typeof firstUserMessage.parts === "string"
            ? firstUserMessage.parts
            : Array.isArray(firstUserMessage.parts)
              ? (
                  firstUserMessage.parts as Array<{
                    type: string;
                    text?: string;
                  }>
                )
                  .filter((p) => p.type === "text" && p.text)
                  .map((p) => p.text)
                  .join(" ")
              : "New Chat";

        const result = await generateText({
          model: groq("llama-3.1-8b-instant"),
          prompt: `Generate a concise 3-6 word title for a chat conversation that starts with this message. Return ONLY the title, no quotes, no punctuation at the end.\n\nUser message: "${userText}"`,
        });

        const title =
          result.text
            ?.trim()
            .replace(/^["']|["']$/g, "")
            .slice(0, 100) || "New Chat";

        await db
          .update(agentChat)
          .set({ title })
          .where(eq(agentChat.id, chatId));
      } catch (error) {
        console.error("Failed to generate chat title:", error);
        // Fallback: use truncated first message
        const fallbackTitle =
          typeof firstUserMessage.parts === "string"
            ? firstUserMessage.parts.slice(0, 50)
            : "New Chat";
        await db
          .update(agentChat)
          .set({ title: fallbackTitle })
          .where(eq(agentChat.id, chatId));
      }
    }
  }

  // Touch updatedAt
  await db
    .update(agentChat)
    .set({ updatedAt: new Date() })
    .where(eq(agentChat.id, chatId));
};

/**
 * Delete an agent chat and all its messages (cascade).
 */
export const deleteAgentChat = async (chatId: string) => {
  const session = await getServerUserSession();
  if (!session) throw new Error("Unauthorized");

  await db
    .delete(agentChat)
    .where(
      and(eq(agentChat.id, chatId), eq(agentChat.userId, session.user.id)),
    );
};
