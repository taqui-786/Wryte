import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useDeleteDoc } from "@/lib/queries/deleteDocQuery";
import { LoadingSpinnerIcon } from "./customIcons";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsString } from "nuqs";

function DeletePageDailog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { mutate, isPending } = useDeleteDoc();
  const router = useRouter();
  const [docId, setDocId] = useQueryState("page", parseAsString);

  const handleDelete = () => {
    if (!docId) return;
    mutate(docId, {
      onSuccess: () => {
        setOpen(false);
        setDocId(null);
        router.push("/write");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && setOpen(val)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your page
            and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <>
                Deleting
                <LoadingSpinnerIcon className="ml-2 animate-spin" size="16" />
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeletePageDailog;
