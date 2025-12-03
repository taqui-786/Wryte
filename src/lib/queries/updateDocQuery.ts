import { toast } from "sonner";
import { updateUserDocs } from "../serverAction";
import { CreateDocSchema, UpdateDocSchema } from "../zodValidations";

import { useMutation, useQueryClient } from "@tanstack/react-query";
interface DocsUpdated {
  id: string;
  title: string;
  content: string;
}
export const useUpdateDoc = () => {
  const queryClient = useQueryClient();
  return useMutation<DocsUpdated, Error, UpdateDocSchema>({
    mutationFn: (variables) => updateUserDocs(variables),
    onSuccess: (newDoc) => {

      queryClient.setQueryData(["users-docs"], (oldData: DocsUpdated[] = []) =>
        oldData.map((doc) =>
          doc.id === newDoc.id && newDoc.title !== oldData[0].title
            ? { ...doc, title: newDoc.title } // update only title
            : doc
        )
      );

      // toast.success("Document updated successfully");
    },
    onError: (error) => {
      toast("Falied To Create Page", {
        description: error.message,
      });
      console.error("Error creating document:", error);
    },
  });
};
