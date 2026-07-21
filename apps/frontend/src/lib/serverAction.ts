"use server";
import { db } from "@/db/dbConnect";
import { docs, messages, thread } from "@/db/schema/auth-schema";
import { auth } from "@/lib/auth";
import { and, eq, InferSelectModel } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import axios from "axios";
import { AIMessageResponse } from "@/components/agent/agent-sidebar/types";
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
  thread_id: string,
  msgs: AIMessageResponse,
): Promise<void> => {
  try {
    console.log(msgs);
    
  const work = await db.insert(messages).values(
  msgs.map((msg, index) => ({
    threadId: thread_id,
    role: msg.type,          
    index,
    data: msg.data,          
  }))
);
if (work) {
  console.log("Agent messages saved successfully");
}
  } catch (error) {
    console.error("Error saving agent messages:", error);
    throw new Error("Error saving agent messages");
  }
}

export const deleteAgentChat = async (_chatId: string): Promise<void> => {
  // no-op
};


// ---------------------------------------------------------------------------
// Agent chat proxy — calls FastAPI SSE backend
// ---------------------------------------------------------------------------
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function* chatWithAgent(
  message: string,
  thread_id: string,
): AsyncGenerator<Record<string, unknown>, void, undefined> {
  const user = await getServerUserSession();
  if(!user?.user.id) {
    throw new Error("User not found");
  }
  
  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id, user_id: user.user.id }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Agent backend returned ${res.status}`);
  }
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  console.log(res);
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "DONE") return;

      try {
        yield JSON.parse(payload);
      } catch {
        // skip malformed JSON chunks
      }
    }
  }
}

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
export type DocWithThread = InferSelectModel<typeof docs> & {
  threads: (InferSelectModel<typeof thread>&{
    messages: InferSelectModel<typeof messages>[];
  })[];
};

export const getDocById = async (docId: string): Promise<DocWithThread | null> => {
  const session = await getServerUserSession();

  if (!session?.user.id) throw new Error("Unauthorized");

  const doc = await db.query.docs.findFirst({
    where: (docs, { and, eq }) => and(
      eq(docs.userId, session.user.id),
      eq(docs.id, docId)
    ),
    with: {
      threads: {
        with: {
          messages: true,
        },
      },
    },
  });

  return doc ?? null;
};
export const createThread = async (docId: string,stateId: string,prompt:string): Promise<InferSelectModel<typeof thread>> => {
  const user_id = await getServerUserSession();
  if(!user_id?.user.id) {
    throw new Error("User not found");
  }
  const generateTitle = await axios.post(`${BACKEND_URL}/generate-chat-title`, {
    conversation:prompt
  });
  console.log(generateTitle.data);
  const res = await db.insert(thread).values({
    docId,
    stateId,
    title: generateTitle.data.title,
  }).returning();
  return res[0];
};


export const getThreadMessages = async (threadId: string):Promise<AIMessageResponse> => {
  const state = await axios.get(`${BACKEND_URL}/get-thread-messages/${threadId}`);
  console.log(state.data.messages);
  
  return state.data.messages;
}