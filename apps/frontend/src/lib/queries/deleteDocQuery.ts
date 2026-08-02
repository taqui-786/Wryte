import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteUserDocs } from "@/lib/serverAction";

export const useDeleteDoc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      return await deleteUserDocs(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-docs"] });
      toast.success("Page Deleted Successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed To Delete Page", {
        description: error.message,
      });
      console.error("Error deleting document:", error);
    },
  });
};
