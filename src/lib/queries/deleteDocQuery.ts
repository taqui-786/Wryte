import { toast } from "sonner";
import { deleteUserDocs } from "../serverAction";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteDoc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteUserDocs(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-docs"] });
      toast.success("Page Deleted Successfully");
    },
    onError: (error) => {
      toast.error("Failed To Delete Page", {
        description: error.message,
      });
      console.error("Error deleting document:", error);
    },
  });
};
