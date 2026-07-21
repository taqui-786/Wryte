import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [adminClient()],
});

export const signIn = async () => {
  await authClient.signIn.social(
    {
      provider: "google",
      callbackURL: "/dashboard",
    },
    { redirect: "follow" },
  );
};

export const signOut = async () => {
  const data = await authClient.signOut();
  return data;
};
