import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DocsUpdated {
  id: string;
  title: string;
  content: string;
}

export type UpdateDocSchema = {
  docId: string;
  title?: string;
  content?: string;
};

export const useUpdateDoc = () => {
  const queryClient = useQueryClient();
  return useMutation<DocsUpdated, Error, UpdateDocSchema>({
    mutationFn: async (variables) => {
      // DB logic removed — return stub
      return {
        id: variables.docId,
        title: variables.title ?? "",
        content: variables.content ?? "",
      };
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["users-docs"], (oldData: DocsUpdated[] = []) =>
        oldData.map((doc) =>
          doc.id === newDoc.id && newDoc.title !== oldData[0]?.title
            ? { ...doc, title: newDoc.title }
            : doc,
        ),
      );
    },
    onError: (error) => {
      toast("Failed To Update Page", {
        description: error.message,
      });
      console.error("Error updating document:", error);
    },
  });
};
