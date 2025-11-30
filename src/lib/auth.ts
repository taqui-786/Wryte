import { db } from "@/db/dbConnect";
import { account, session, user, verification } from "@/db/schema/auth-schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", 
    schema:{
      verification:verification,
      user:user,
      session:session,
      account:account 
    }
  }),
  socialProviders: {
    google: {
        prompt: "select_account", 
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
