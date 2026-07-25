"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_KEY = "wryte:autosave-enabled";

function readStoredFlag(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(AUTOSAVE_KEY);
  if (raw === null) return true;
  return raw === "true";
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  docId: string;
  title: string;
  content: string;
  debounceMs?: number;
  onSave: (payload: {
    docId: string;
    title: string;
    content: string;
  }) => Promise<void>;
}

interface UseAutosaveResult {
  autosaveEnabled: boolean;
  setAutosaveEnabled: (enabled: boolean) => void;
  toggleAutosave: () => void;
  saveNow: () => Promise<void>;
  status: SaveStatus;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export function useAutosave({
  docId,
  title,
  content,
  debounceMs = 1500,
  onSave,
}: UseAutosaveOptions): UseAutosaveResult {
  const [autosaveEnabled, setAutosaveEnabledState] = useState<boolean>(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useRef({ title, content });
  const lastSavedRef = useRef<{ title: string; content: string }>(
    initialSnapshot.current,
  );
  const isSavingRef = useRef(false);
  const latestRef = useRef({ docId, title, content, onSave });

  useEffect(() => {
    latestRef.current = { docId, title, content, onSave };
  }, [docId, title, content, onSave]);

  useEffect(() => {
    setAutosaveEnabledState(readStoredFlag());
  }, []);

  const persistFlag = useCallback((enabled: boolean) => {
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, String(enabled));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, []);

  const setAutosaveEnabled = useCallback(
    (enabled: boolean) => {
      setAutosaveEnabledState(enabled);
      persistFlag(enabled);
      if (!enabled && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [persistFlag],
  );

  const toggleAutosave = useCallback(() => {
    setAutosaveEnabledState((prev) => {
      const next = !prev;
      persistFlag(next);
      if (!next && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return next;
    });
  }, [persistFlag]);

  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;
    const { docId, title, content, onSave } = latestRef.current;
    if (
      title === lastSavedRef.current.title &&
      content === lastSavedRef.current.content
    ) {
      setHasUnsavedChanges(false);
      return;
    }

    isSavingRef.current = true;
    setStatus("saving");
    try {
      await onSave({ docId, title, content });
      lastSavedRef.current = { title, content };
      setHasUnsavedChanges(false);
      setStatus("saved");
    } catch (err) {
      console.error("Autosave failed:", err);
      setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  useEffect(() => {
    const changed =
      title !== lastSavedRef.current.title ||
      content !== lastSavedRef.current.content;
    setHasUnsavedChanges(changed);

    if (!autosaveEnabled || !changed) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [title, content, autosaveEnabled, debounceMs, performSave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (autosaveEnabled && hasUnsavedChanges && !isSavingRef.current) {
        const { docId, title, content } = latestRef.current;
        const blob = new Blob([JSON.stringify({ docId, title, content })], {
          type: "application/json",
        });
        navigator.sendBeacon?.("/api/save-doc", blob);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosaveEnabled, hasUnsavedChanges]);

  return {
    autosaveEnabled,
    setAutosaveEnabled,
    toggleAutosave,
    saveNow,
    status,
    isSaving: status === "saving",
    hasUnsavedChanges,
  };
}
