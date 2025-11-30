import { db } from "./dbConnect";
import { migrate } from "drizzle-orm/neon-http/migrator";
const main = async () => {
    try {
        await migrate(db, {
            migrationsFolder:"./src/db/migrations"
        })
        console.log("migration complete");
        
    } catch (error) {
        console.log('Migration error',error);
        
    }
}
main()