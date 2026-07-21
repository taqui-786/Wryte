"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminUserRow,
  deleteUser,
  getAdminUserById,
  getAdminUsers,
  getUserDocuments,
  resetUserDailyQuota,
  updateUserDetails,
} from "@/lib/admin-actions";

const PAGE_SIZE = 25;

type DrawerState = {
  mode: "edit" | "documents";
  user: AdminUserRow;
} | null;

type PendingAction = {
  kind: "edit" | "documents" | "resetQuota" | "delete";
  user: AdminUserRow;
} | null;

type EditableRole = "user" | "admin";

const formatDateTime = (input: Date | string | null) => {
  if (!input) return "Never";

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getPendingActionMeta = (action: PendingAction) => {
  if (!action) return null;

  if (action.kind === "edit") {
    return {
      title: "Open Edit Drawer?",
      description: `You'll open editable details for ${action.user.name}.`,
      label: "Continue",
      variant: "default" as const,
    };
  }

  if (action.kind === "documents") {
    return {
      title: "Open Documents Drawer?",
      description: `Load documents created by ${action.user.name}.`,
      label: "Open",
      variant: "default" as const,
    };
  }

  if (action.kind === "resetQuota") {
    return {
      title: "Reset Daily Quota?",
      description: `This clears today's AI usage logs for ${action.user.name}.`,
      label: "Reset Quota",
      variant: "default" as const,
    };
  }

  return {
    title: "Delete User?",
    description: `This permanently deletes ${action.user.name} and related data.`,
    label: "Delete User",
    variant: "destructive" as const,
  };
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user" as EditableRole,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const usersQuery = useInfiniteQuery({
    queryKey: ["admin-users", deferredSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getAdminUsers({
        limit: PAGE_SIZE,
        offset: pageParam,
        search: deferredSearch,
      }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    staleTime: 30_000,
  });

  const users = useMemo(() => {
    const deduped = new Map<string, AdminUserRow>();
    for (const page of usersQuery.data?.pages ?? []) {
      for (const currentUser of page.users) {
        deduped.set(currentUser.id, currentUser);
      }
    }
    return Array.from(deduped.values());
  }, [usersQuery.data?.pages]);

  const selectedUserId = drawerState?.user.id ?? null;

  const selectedUserDetailsQuery = useQuery({
    queryKey: ["admin-user-details", selectedUserId],
    queryFn: () => getAdminUserById(selectedUserId as string),
    enabled: drawerState?.mode === "edit" && Boolean(selectedUserId),
    staleTime: 10_000,
  });

  const selectedUserDocsQuery = useQuery({
    queryKey: ["admin-user-documents", selectedUserId],
    queryFn: () => getUserDocuments(selectedUserId as string),
    enabled: drawerState?.mode === "documents" && Boolean(selectedUserId),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!selectedUserDetailsQuery.data) return;

    setEditForm({
      name: selectedUserDetailsQuery.data.name,
      email: selectedUserDetailsQuery.data.email,
      role: selectedUserDetailsQuery.data.role === "admin" ? "admin" : "user",
    });
  }, [selectedUserDetailsQuery.data]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = loadMoreRef.current;

    if (
      !root ||
      !target ||
      !usersQuery.hasNextPage ||
      usersQuery.isFetchingNextPage
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          usersQuery.fetchNextPage();
        }
      },
      {
        root,
        rootMargin: "320px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    usersQuery.fetchNextPage,
    usersQuery.hasNextPage,
    usersQuery.isFetchingNextPage,
  ]);

  const resetQuotaMutation = useMutation({
    mutationFn: (userId: string) => resetUserDailyQuota(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUserId === userId) {
        queryClient.invalidateQueries({
          queryKey: ["admin-user-details", userId],
        });
      }
      toast.success("Daily quota reset.");
    },
    onError: (error: Error) => {
      toast.error("Failed to reset daily quota.", {
        description: error.message,
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.removeQueries({ queryKey: ["admin-user-details", userId] });
      queryClient.removeQueries({ queryKey: ["admin-user-documents", userId] });
      if (selectedUserId === userId) {
        setDrawerState(null);
      }
      toast.success("User deleted.");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete user.", { description: error.message });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (payload: {
      userId: string;
      name: string;
      email: string;
      role: EditableRole;
    }) =>
      updateUserDetails(payload.userId, {
        name: payload.name,
        email: payload.email,
        role: payload.role,
      }),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-user-details", payload.userId],
      });
      toast.success("User updated.");
      setSaveConfirmOpen(false);
      setDrawerState(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to update user.", { description: error.message });
    },
  });

  const confirmMeta = getPendingActionMeta(pendingAction);
  const actionInFlight =
    resetQuotaMutation.isPending ||
    deleteUserMutation.isPending ||
    updateUserMutation.isPending;

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    if (pendingAction.kind === "edit") {
      setDrawerState({ mode: "edit", user: pendingAction.user });
      setPendingAction(null);
      return;
    }

    if (pendingAction.kind === "documents") {
      setDrawerState({ mode: "documents", user: pendingAction.user });
      setPendingAction(null);
      return;
    }

    if (pendingAction.kind === "resetQuota") {
      resetQuotaMutation.mutate(pendingAction.user.id);
      setPendingAction(null);
      return;
    }

    deleteUserMutation.mutate(pendingAction.user.id);
    setPendingAction(null);
  };

  const handleSaveUpdate = () => {
    if (!drawerState || drawerState.mode !== "edit") return;
    updateUserMutation.mutate({
      userId: drawerState.user.id,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    });
  };

  return (
    <main className="h-dvh w-full p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-lg font-semibold">Admin Users</h1>
            <p className="text-sm text-muted-foreground">
              {usersQuery.data?.pages?.[0]?.total ?? 0} total users
            </p>
          </div>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email..."
            className="max-w-sm"
          />
        </div>

        {usersQuery.isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Failed to load users</AlertTitle>
              <AlertDescription>
                {(usersQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Daily Requests</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((currentUser) => (
                <TableRow key={currentUser.id}>
                  <TableCell className="font-medium">
                    {currentUser.name}
                  </TableCell>
                  <TableCell>{currentUser.email}</TableCell>
                  <TableCell>{formatDateTime(currentUser.lastLogin)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {currentUser.dailyRequests}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPendingAction({ kind: "edit", user: currentUser })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPendingAction({
                            kind: "documents",
                            user: currentUser,
                          })
                        }
                      >
                        Documents
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPendingAction({
                            kind: "resetQuota",
                            user: currentUser,
                          })
                        }
                      >
                        Reset Quota
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setPendingAction({
                            kind: "delete",
                            user: currentUser,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                      <Spinner />
                      Loading users...
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!usersQuery.isLoading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Empty className="rounded-none border-0">
                      <EmptyHeader>
                        <EmptyTitle>No users found</EmptyTitle>
                        <EmptyDescription>
                          Try a different search query.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : null}

              {usersQuery.isFetchingNextPage ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Spinner />
                      Loading more users...
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div ref={loadMoreRef} className="h-1 w-full" />
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmMeta?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMeta?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionInFlight}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmMeta?.variant ?? "default"}
              onClick={handleConfirmAction}
              disabled={actionInFlight}
            >
              {actionInFlight ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Processing...
                </span>
              ) : (
                (confirmMeta?.label ?? "Confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer
        direction="right"
        open={Boolean(drawerState)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerState(null);
            setSaveConfirmOpen(false);
          }
        }}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>
              {drawerState?.mode === "edit" ? "Edit User" : "User Documents"}
            </DrawerTitle>
            <DrawerDescription>
              {drawerState?.mode === "edit"
                ? `Update profile and role for ${drawerState?.user.name ?? ""}.`
                : `Documents created by ${drawerState?.user.name ?? ""}.`}
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            {drawerState?.mode === "edit" ? (
              <div className="flex flex-col gap-6">
                {selectedUserDetailsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner />
                    Loading user details...
                  </div>
                ) : null}

                {selectedUserDetailsQuery.data ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        Last login:{" "}
                        {formatDateTime(
                          selectedUserDetailsQuery.data.lastLogin,
                        )}
                      </Badge>
                      <Badge variant="outline">
                        Daily requests:{" "}
                        {selectedUserDetailsQuery.data.dailyRequests}
                      </Badge>
                      <Badge variant="outline">
                        Docs: {selectedUserDetailsQuery.data.documentsCount}
                      </Badge>
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="admin-user-name">Name</FieldLabel>
                        <Input
                          id="admin-user-name"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((previous) => ({
                              ...previous,
                              name: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="admin-user-email">
                          Email
                        </FieldLabel>
                        <Input
                          id="admin-user-email"
                          type="email"
                          value={editForm.email}
                          onChange={(event) =>
                            setEditForm((previous) => ({
                              ...previous,
                              email: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Role</FieldLabel>
                        <Select
                          value={editForm.role}
                          onValueChange={(value) =>
                            setEditForm((previous) => ({
                              ...previous,
                              role: value === "admin" ? "admin" : "user",
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          Admin users can manage users and quotas.
                        </FieldDescription>
                      </Field>
                    </FieldGroup>
                  </>
                ) : null}
              </div>
            ) : null}

            {drawerState?.mode === "documents" ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedUserDocsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <div className="flex items-center gap-2 py-4 text-muted-foreground">
                            <Spinner />
                            Loading documents...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {(selectedUserDocsQuery.data ?? []).map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doc.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(doc.updatedAt)}</TableCell>
                      </TableRow>
                    ))}

                    {!selectedUserDocsQuery.isLoading &&
                    (selectedUserDocsQuery.data?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-muted-foreground"
                        >
                          This user has not created any documents yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>

          <DrawerFooter>
            {drawerState?.mode === "edit" ? (
              <>
                <Button
                  onClick={() => setSaveConfirmOpen(true)}
                  disabled={
                    !selectedUserDetailsQuery.data ||
                    updateUserMutation.isPending
                  }
                >
                  {updateUserMutation.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <AlertDialog
                  open={saveConfirmOpen}
                  onOpenChange={setSaveConfirmOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apply user updates?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will update profile details and role immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={updateUserMutation.isPending}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSaveUpdate}
                        disabled={updateUserMutation.isPending}
                      >
                        {updateUserMutation.isPending ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner />
                            Updating...
                          </span>
                        ) : (
                          "Confirm Update"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}
