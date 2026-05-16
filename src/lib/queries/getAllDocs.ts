import { useQuery } from "@tanstack/react-query";
import { getAllDocs } from "@/lib/serverAction";
import { InferSelectModel } from "drizzle-orm";
import { docs } from "@/db/schema/auth-schema";

type DocReturnType = InferSelectModel<typeof docs>;

export const useGetAllDocs = () => {
  return useQuery<DocReturnType[], Error>({
    queryKey: ["users-docs"],
    queryFn: async () => {
      const result = await getAllDocs();
      if (!result) {
        throw new Error("Failed to fetch documents");
      }
      return result;
    },
  });
};
