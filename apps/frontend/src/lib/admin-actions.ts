"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Types — kept so AdminUsersPage.tsx compiles without changes
// ---------------------------------------------------------------------------
type AdminRole = "admin" | "user";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  dailyRequests: number;
  documentsCount?: number;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
};

// ---------------------------------------------------------------------------
// Admin session guard — kept (uses better-auth, not DB)
// ---------------------------------------------------------------------------
const normalizeRole = (role: string | string[] | null | undefined): string => {
  if (Array.isArray(role)) return role.join(",");
  return role ?? "user";
};

const hasAdminRole = (role: string | string[] | null | undefined): boolean => {
  const roleString = normalizeRole(role);
  return roleString.split(",").some((item) => item.trim() === "admin");
};

async function requireAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized: You must be signed in.");
  }

  if (!hasAdminRole(session.user.role)) {
    throw new Error("Forbidden: Admin access required.");
  }

  return session;
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const session = await requireAdminSession();
    return hasAdminRole(session.user.role);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Stub implementations — DB queries removed, return empty/static data
// ---------------------------------------------------------------------------

export async function getAdminUsers({
  limit = 25,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminUsersResponse> {
  await requireAdminSession();
  return {
    users: [],
    total: 0,
    limit,
    offset,
    nextOffset: null,
  };
}

export async function getAdminUserById(
  _userId: string,
): Promise<AdminUserRow | null> {
  await requireAdminSession();
  return null;
}

export async function getUserDocuments(_userId: string): Promise<
  Array<{
    id: string;
    title: string;
    status: string | null;
    isDeleted: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  await requireAdminSession();
  return [];
}


export async function getUserDailyRequests(_userId: string): Promise<number> {
  await requireAdminSession();
  return 0;
}

export async function getUserLastLogin(_userId: string): Promise<Date | null> {
  await requireAdminSession();
  return null;
}

export async function updateUserDetails(
  userId: string,
  data: { name?: string; email?: string; role?: AdminRole },
) {
  const session = await requireAdminSession();
  const authHeaders = await headers();

  const nextData: Record<string, string> = {};

  if (typeof data.name === "string") {
    const name = data.name.trim();
    if (!name) throw new Error("Name cannot be empty.");
    nextData.name = name;
  }

  if (typeof data.email === "string") {
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty.");
    nextData.email = email;
  }

  if (Object.keys(nextData).length > 0) {
    await auth.api.adminUpdateUser({
      body: { userId, data: nextData },
      headers: authHeaders,
    });
  }

  if (data.role) {
    if (session.user.id === userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }
    await auth.api.setRole({
      body: { userId, role: data.role },
      headers: authHeaders,
    });
  }

  return getAdminUserById(userId);
}

export async function deleteUser(userId: string) {
  const session = await requireAdminSession();

  if (session.user.id === userId) {
    throw new Error("You cannot delete your own account.");
  }

  await auth.api.removeUser({
    body: { userId },
    headers: await headers(),
  });

  return { id: userId };
}

export async function resetUserDailyQuota(_userId: string) {
  await requireAdminSession();
  return { deleted: 0 };
}

export async function getUserStats(_userId: string) {
  await requireAdminSession();
  return {
    totalDocs: 0,
    totalRequests: 0,
    totalTokens: 0,
    lastLogin: null,
    dailyRequests: 0,
  };
}
