"use server";

import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/dbConnect";
import { aiUsageLogs } from "@/db/schema/ai-usage-schema";
import { docs, session as sessionTable, user } from "@/db/schema/auth-schema";
import { auth } from "@/lib/auth";

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
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
};

const normalizeRole = (role: string | string[] | null | undefined): string => {
  if (Array.isArray(role)) return role.join(",");
  return role ?? "user";
};

const hasAdminRole = (role: string | string[] | null | undefined): boolean => {
  const roleString = normalizeRole(role);
  return roleString.split(",").some((item) => item.trim() === "admin");
};

const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
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

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const session = await requireAdminSession();
    return hasAdminRole(session.user.role);
  } catch {
    return false;
  }
}

/**
 * Get all users with pagination for admin
 */
export async function getAdminUsers({
  limit = 25,
  offset = 0,
  search = "",
}: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<AdminUsersResponse> {
  await requireAdminSession();

  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, offset);
  const normalizedSearch = search.trim();

  const whereClause = normalizedSearch
    ? or(
        sql`lower(${user.name}) like lower(${`%${normalizedSearch}%`})`,
        sql`lower(${user.email}) like lower(${`%${normalizedSearch}%`})`,
      )
    : undefined;

  const usersPage = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(safeLimit)
    .offset(safeOffset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;
  if (usersPage.length === 0) {
    return {
      users: [],
      total,
      limit: safeLimit,
      offset: safeOffset,
      nextOffset: null,
    };
  }

  const userIds = usersPage.map((item) => item.id);
  const { today, tomorrow } = getTodayRange();

  const [lastLoginRows, usageRows] = await Promise.all([
    db
      .select({
        userId: sessionTable.userId,
        lastLogin: sql<Date | null>`max(${sessionTable.updatedAt})`,
      })
      .from(sessionTable)
      .where(inArray(sessionTable.userId, userIds))
      .groupBy(sessionTable.userId),
    db
      .select({
        userId: aiUsageLogs.userId,
        dailyRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          inArray(aiUsageLogs.userId, userIds),
          gte(aiUsageLogs.createdAt, today),
          lt(aiUsageLogs.createdAt, tomorrow),
        ),
      )
      .groupBy(aiUsageLogs.userId),
  ]);

  const lastLoginMap = new Map(
    lastLoginRows.map((item) => [item.userId, item.lastLogin]),
  );
  const usageMap = new Map(
    usageRows.map((item) => [item.userId, item.dailyRequests]),
  );

  const users = usersPage.map((item) => ({
    ...item,
    role: normalizeRole(item.role),
    lastLogin: lastLoginMap.get(item.id) ?? null,
    dailyRequests: usageMap.get(item.id) ?? 0,
  }));

  return {
    users,
    total,
    limit: safeLimit,
    offset: safeOffset,
    nextOffset: safeOffset + safeLimit < total ? safeOffset + safeLimit : null,
  };
}

/**
 * Get a single user by ID
 */
export async function getAdminUserById(userId: string) {
  await requireAdminSession();

  const userData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const baseUser = userData[0];
  if (!baseUser) return null;

  const [lastLogin, dailyRequests, documentsCount] = await Promise.all([
    getUserLastLogin(userId),
    getUserDailyRequests(userId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(docs)
      .where(eq(docs.userId, userId)),
  ]);

  return {
    ...baseUser,
    role: normalizeRole(baseUser.role),
    lastLogin,
    dailyRequests,
    documentsCount: documentsCount[0]?.count ?? 0,
  };
}

/**
 * Get user's documents
 */
export async function getUserDocuments(userId: string) {
  await requireAdminSession();

  const userDocs = await db
    .select({
      id: docs.id,
      title: docs.title,
      status: docs.status,
      isDeleted: docs.isDeleted,
      createdAt: docs.createdAt,
      updatedAt: docs.updatedAt,
    })
    .from(docs)
    .where(eq(docs.userId, userId))
    .orderBy(desc(docs.updatedAt));

  return userDocs;
}

/**
 * Get daily request count for a user
 */
export async function getUserDailyRequests(userId: string): Promise<number> {
  await requireAdminSession();
  const { today, tomorrow } = getTodayRange();

  const result = await db
    .select({
      totalRequests: sql<number>`coalesce(sum(${aiUsageLogs.requestCount}), 0)::int`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        gte(aiUsageLogs.createdAt, today),
        lt(aiUsageLogs.createdAt, tomorrow),
      ),
    );

  return result[0]?.totalRequests || 0;
}

/**
 * Get user's last login from sessions
 */
export async function getUserLastLogin(userId: string): Promise<Date | null> {
  await requireAdminSession();

  const lastSession = await db
    .select({ updatedAt: sessionTable.updatedAt })
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .orderBy(desc(sessionTable.updatedAt))
    .limit(1);

  return lastSession[0]?.updatedAt || null;
}

/**
 * Update user details (name, role)
 */
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
      body: {
        userId,
        data: nextData,
      },
      headers: authHeaders,
    });
  }

  if (data.role) {
    if (session.user.id === userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }

    await auth.api.setRole({
      body: {
        userId,
        role: data.role,
      },
      headers: authHeaders,
    });
  }

  return getAdminUserById(userId);
}

/**
 * Delete a user
 */
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

/**
 * Reset user's daily quota (clear today's usage logs)
 */
export async function resetUserDailyQuota(userId: string) {
  await requireAdminSession();
  const { today, tomorrow } = getTodayRange();

  const result = await db
    .delete(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        gte(aiUsageLogs.createdAt, today),
        lt(aiUsageLogs.createdAt, tomorrow),
      ),
    )
    .returning({ id: aiUsageLogs.id });

  return { deleted: result.length };
}

/**
 * Get comprehensive user stats for admin
 */
export async function getUserStats(userId: string) {
  await requireAdminSession();

  // Total documents
  const docsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(docs)
    .where(eq(docs.userId, userId));

  // Total AI requests
  const requestsCount = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${aiUsageLogs.totalTokens}), 0)::int`,
    })
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.userId, userId));

  // Last login
  const lastLogin = await getUserLastLogin(userId);

  // Daily requests
  const dailyRequests = await getUserDailyRequests(userId);

  return {
    totalDocs: docsCount[0]?.count || 0,
    totalRequests: requestsCount[0]?.count || 0,
    totalTokens: requestsCount[0]?.totalTokens || 0,
    lastLogin,
    dailyRequests,
  };
}
