"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/db/dbConnect";
import { docs } from "@/db/schema/auth-schema";
import { and, eq } from "drizzle-orm";
import { CreateDocSchema, UpdateDocSchema } from "./zodValidations";
import { cache } from "react";

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
