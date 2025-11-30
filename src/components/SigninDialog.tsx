"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authClient, signIn, signOut } from "@/lib/authClient";
import { Spinner } from "./ui/spinner";

function SigninDialog() {
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      setProcessing(true);

      const user = await authClient.getSession();
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
      setIsLoading(true)
    await signOut();
    setSession(false);
    } catch (error) {
      console.error("sign out  error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild disabled={processing}>
        <Button variant={session ? "outline" : "default"}>
          {processing ? <Spinner /> : session ? "Sign out" : "Sign in"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{session ? "Sign out" : "Sign in"}</DialogTitle>
          <DialogDescription>
            {session
              ? "Are you sure you want to sign out?"
              : "Sign in to your account to continue."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {session ? (
            <Button onClick={handleLogout} className="w-full" >{isLoading ? "Signing out..." : "Sign out"}</Button>
          ) : (
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SigninDialog;
