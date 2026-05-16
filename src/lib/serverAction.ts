"use server";
import { db } from "@/db/dbConnect";
import { docs } from "@/db/schema/auth-schema";
import { auth } from "@/lib/auth";
import { and, eq, InferSelectModel } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";

// ---------------------------------------------------------------------------
// Auth helper — kept (uses better-auth, not DB directly)
// ---------------------------------------------------------------------------
export const getServerUserSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

// ---------------------------------------------------------------------------
// Weather helpers — kept (no DB)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Doc stubs — DB logic removed, UI callers won't crash
// ---------------------------------------------------------------------------
export type StubDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
};

export const getUserDocs = async (): Promise<StubDoc[]> => {
  return [];
};

export const getDocsById = async (_id: string): Promise<StubDoc[]> => {
  return [];
};

export const createUserDocs = async (_payload: {
  title: string;
  content?: string;
}): Promise<StubDoc> => {
  return {
    id: "stub-doc-id",
    title: _payload.title,
    content: _payload.content ?? "",
    updatedAt: new Date(),
  };
};

export const updateUserDocs = async (_payload: {
  docId: string;
  title?: string;
  content?: string;
}): Promise<StubDoc> => {
  return {
    id: _payload.docId,
    title: _payload.title ?? "",
    content: _payload.content ?? "",
    updatedAt: new Date(),
  };
};

export const deleteUserDocs = async (
  _docId: string,
): Promise<StubDoc | undefined> => {
  return undefined;
};

// ---------------------------------------------------------------------------
// Agent chat stubs — DB logic removed
// ---------------------------------------------------------------------------
export type StubAgentChat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export const getAllAgentChats = async (
  _docId: string,
): Promise<StubAgentChat[]> => {
  return [];
};

export const getAgentChatMessages = async (
  _chatId: string,
): Promise<null> => {
  return null;
};

export const createAgentChat = async (
  _docId: string,
): Promise<StubAgentChat> => {
  return {
    id: "stub-chat-id",
    title: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const saveAgentMessages = async (
  _chatId: string,
  _messages: Array<{ id: string; role: string; parts: unknown }>,
): Promise<void> => {
  // no-op
};

export const deleteAgentChat = async (_chatId: string): Promise<void> => {
  // no-op
};


export const createNewDoc = async (): Promise<InferSelectModel<typeof docs>> => {
  const user_id = await getServerUserSession();
  if(!user_id?.user.id) {
    throw new Error("User not found");
  }
  const doc = await db.insert(docs).values({
    title: `Untitled Doc ${crypto.randomUUID().slice(0, 5)}`,
    updatedAt: new Date(),
    userId: user_id.user.id,
  }).returning();
  return doc[0];
};

export const getAllDocs = async (): Promise<InferSelectModel<typeof docs>[]> => {
  const user_id = await getServerUserSession();
  if(!user_id?.user.id) {
    throw new Error("User not found");
  }
  const all_docs = await db.select().from(docs).where(eq(docs.userId, user_id.user.id));
  return all_docs;
};

export const getDocById = async (docId: string): Promise<InferSelectModel<typeof docs> | null> => {
  const user_id = await getServerUserSession();
  if(!user_id?.user.id) {
    throw new Error("User not found");
  }
  const doc = await db.select().from(docs).where(and(eq(docs.userId, user_id.user.id), eq(docs.id, docId))).limit(1);
  return doc[0] || null;
};