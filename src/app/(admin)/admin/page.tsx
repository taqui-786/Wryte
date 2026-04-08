import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminUsersPage from "@/components/admin/AdminUsersPage";
import { auth } from "@/lib/auth";

const hasAdminRole = (role: string | string[] | null | undefined) => {
  const normalized = Array.isArray(role) ? role.join(",") : (role ?? "");
  return normalized.split(",").some((item) => item.trim() === "admin");
};

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/signin");
  }

  if (!hasAdminRole(session.user.role)) {
    redirect("/write");
  }

  return <AdminUsersPage />;
}
