import { toast } from "sonner";
import { createUserDocs } from "../serverAction";
import { CreateDocSchema } from "../zodValidations";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type DocReturnType = Awaited<ReturnType<typeof createUserDocs>>;

export const useCreateDoc = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation<DocReturnType, Error, CreateDocSchema>({
    mutationFn: (variables) => createUserDocs(variables),
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["users-docs"], (oldData: any[]) =>
        oldData ? [...oldData, newDoc] : [newDoc],
      );
      toast.success("Document created successfully");
      router.push(`/write?page=${newDoc?.id}`);
    },
    onError: (error) => {
      toast("Falied To Create Page", {
        description: error.message,
      });
      console.error("Error creating document:", error);
    },
  });
};
