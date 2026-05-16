import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type DocReturnType = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
};

export const useCreateDoc = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation<DocReturnType, Error, { title: string; content?: string }>(
    {
      mutationFn: async (variables) => {
        // DB logic removed — return a stub doc
        return {
          id: `stub-${Date.now()}`,
          title: variables.title,
          content: variables.content ?? "",
          updatedAt: new Date(),
        };
      },
      onSuccess: (newDoc) => {
        queryClient.setQueryData(["users-docs"], (oldData: DocReturnType[]) =>
          oldData ? [...oldData, newDoc] : [newDoc],
        );
        toast.success("Document created successfully");
        router.push(`/write?page=${newDoc?.id}`);
      },
      onError: (error) => {
        toast("Failed To Create Page", {
          description: error.message,
        });
        console.error("Error creating document:", error);
      },
    },
  );
};
