import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

import * as authSchema from "./schema/auth-schema";
import * as agentSchema from "./schema/agent-schema";

config({ path: ".env" }); // or .env.local

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({
  client: sql,
  schema: { ...authSchema, ...agentSchema },
  logger: true,
});
