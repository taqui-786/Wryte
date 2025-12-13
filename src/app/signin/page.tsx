"use client";
import { Button } from "@/components/ui/button";
import { StripedPattern } from "@/components/ui/striped-pattern";
import { authClient, signIn, signOut } from "@/lib/authClient";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function page() {
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const getSession = async () => {
      setProcessing(true);

      const user = await authClient.getSession();
      console.log(user);

      setSession(!!user.data?.session);
      setProcessing(false);
    };
    getSession();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();
      setSession(false);
      router.push("/");
    } catch (error) {
      console.error("sign out  error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="h-dvh bg-background w-full flex items-center justify-center relative ">
      <StripedPattern className="[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]" />
      <div className="p-2 z-50">
        <div className="px-14 py-8">
          <span className="text-5xl font-funnel font-semibold text-primary dark:text-primary">
            Wryte.
          </span>
        </div>
        <div className="flex justify-center mt-8">
          {session ? (
            <Button onClick={handleLogout} className="w-full">
              {isLoading ? "Signing out..." : "Sign out"}
            </Button>
          ) : (
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full cursor-pointer"
            >
              {isLoading ? "Redirecting to Google..." : "Continue with Google"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

export default page;
