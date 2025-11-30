import { toast } from "sonner";
import { createUserDocs } from "../serverAction";
import { CreateDocSchema } from "../zodValidations";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateDoc = () => {
  const queryClient = useQueryClient();
  return useMutation<CreateDocSchema, Error, CreateDocSchema>({
    mutationFn: (variables) => createUserDocs(variables),
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["users-docs"], (oldData: any[]) =>
        oldData ? [...oldData, newDoc] : [newDoc]
      );
      toast.success("Document created successfully");
    },
    onError: (error) => {
      toast("Falied To Create Page", {
        description: error.message,
      });
      console.error("Error creating document:", error);
    },
  });
};
