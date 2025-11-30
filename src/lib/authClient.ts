import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
  });
  return data
};

export const signOut = async () => {
  const data = await authClient.signOut();
};

