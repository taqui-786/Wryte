"use client";
import { signOut } from "@/lib/authClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SidebarTrigger } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { getServerUserSession } from "@/lib/serverAction";
import { useRouter } from "next/navigation";
interface userType {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null | undefined;
}
function UserHeader() {
  const [user, setUser] = useState<userType | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const res = await getServerUserSession();

      if (res?.user) {
        setUser(res?.user);
      }
      setIsPending(false);
    };
    getUser();
  }, []);
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();

      router.push("/");
    } catch (error) {
      console.error("sign out  error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <header className="w-full p-2 flex border-b justify-between items-center gap-4">
      <SidebarTrigger />
      {isPending ? (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex h-auto items-center gap-3 rounded-full px-2 py-1"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.image as string}
                  alt={user?.name || "User"}
                />
                <AvatarFallback>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

export default UserHeader;
