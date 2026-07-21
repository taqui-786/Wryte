import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createNewDoc } from "@/lib/serverAction";
import { InferSelectModel } from "drizzle-orm";
import { docs } from "@/db/schema/auth-schema";

type DocReturnType = InferSelectModel<typeof docs>;

export const useCreateNewDoc = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<DocReturnType, Error>({
    mutationFn: async () => {
      const result = await createNewDoc();
      if (!result) {
        throw new Error("Failed to create document");
      }
      return result;
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ["users-docs"] });
      toast.success("Document created successfully");
      router.push(`/doc/${newDoc.id}`);
    },
    onError: (error) => {
      toast.error("Failed to create document", {
        description: error.message,
      });
      console.error("Error creating document:", error);
    },
  });
};
