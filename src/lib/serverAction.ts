"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/db/dbConnect";
import { docs } from "@/db/schema/auth-schema";
import { and, eq } from "drizzle-orm";
import { CreateDocSchema } from "./zodValidations";

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string,
});

export const getServerUserSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
};

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
  const response = await db
    .select({
      id: docs.id,
      title: docs.title,
      content: docs.content,
      updatedAt:docs.updatedAt
    })
    .from(docs)
    .where(
      and(eq(docs.userId, session?.user.id as string), eq(docs.id, id as string))
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
