import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteDoc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_docId: string) => {
      // DB logic removed — no-op stub
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
