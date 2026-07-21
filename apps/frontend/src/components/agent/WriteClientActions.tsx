import {
  Clock04Icon,
  Loading03Icon,
  MoreVerticalSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDistanceToNow } from "date-fns";
import { DeleteIcon } from "@/components/my-editor/editorIcons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WriteClientActionsProps = {
  hasActiveDoc: boolean;
  updatedAt?: string | Date | null;
  isUpdatingDoc: boolean;
  isAutoSaving: boolean;
  isPending: boolean;
  onSave: () => void;
  onCreate: () => void;
  onDelete: () => void;
};

function SaveStateLabel({
  isAutoSaving,
  isUpdatingDoc,
}: {
  isAutoSaving: boolean;
  isUpdatingDoc: boolean;
}) {
  if (isAutoSaving) {
    return (
      <>
        <HugeiconsIcon
          icon={Loading03Icon}
          size="18"
          className="animate-spin"
        />
        Auto Saving
      </>
    );
  }

  if (isUpdatingDoc) {
    return (
      <>
        <HugeiconsIcon
          icon={Loading03Icon}
          size="18"
          className="animate-spin"
        />
        Saving
      </>
    );
  }

  return "Save Changes";
}

export default function WriteClientActions({
  hasActiveDoc,
  updatedAt,
  isUpdatingDoc,
  isAutoSaving,
  isPending,
  onSave,
  onCreate,
  onDelete,
}: WriteClientActionsProps) {
  return (
    <div className="p-2 flex items-center justify-between">
      <div>
        {hasActiveDoc ? (
          <div className="flex gap-2 items-center text-muted-foreground">
            <HugeiconsIcon icon={Clock04Icon} size="20" />
            <span className="text-sm font-medium">
              Last edited{" "}
              {updatedAt
                ? formatDistanceToNow(new Date(updatedAt))
                : "just now"}{" "}
              ago
            </span>
          </div>
        ) : null}
      </div>

      <div>
        {hasActiveDoc ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              disabled={isUpdatingDoc || isAutoSaving}
              onClick={onSave}
              variant="outline"
            >
              <SaveStateLabel
                isAutoSaving={isAutoSaving}
                isUpdatingDoc={isUpdatingDoc}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <HugeiconsIcon icon={MoreVerticalSquare01Icon} size="20" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <DeleteIcon size="16" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button disabled={isPending} onClick={onCreate}>
            {isPending ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size="18"
                  className="animate-spin"
                />
                Creating
              </>
            ) : (
              "Create Page"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
