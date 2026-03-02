type ParsedAiApiError = {
  error: string;
  feature?: string;
  message?: string;
  resetAt?: string;
  remaining?: {
    tokens?: number;
    requests?: number;
  };
};

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
};

const parseFromString = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value);
    return toObject(parsed);
  } catch {
    return null;
  }
};

export const parseAiApiError = (input: unknown): ParsedAiApiError | null => {
  const source =
    typeof input === "string"
      ? parseFromString(input)
      : input instanceof Error
        ? parseFromString(input.message)
        : toObject(input);

  if (!source) return null;
  if (typeof source.error !== "string") return null;

  const remaining = toObject(source.remaining);

  return {
    error: source.error,
    feature: typeof source.feature === "string" ? source.feature : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
    resetAt: typeof source.resetAt === "string" ? source.resetAt : undefined,
    remaining: remaining
      ? {
          tokens:
            typeof remaining.tokens === "number" ? remaining.tokens : undefined,
          requests:
            typeof remaining.requests === "number"
              ? remaining.requests
              : undefined,
        }
      : undefined,
  };
};
