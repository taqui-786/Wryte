import z from "zod";

export const createDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
});

export type CreateDocSchema = z.infer<typeof createDocSchema>;
export const updateDocSchema = z.object({
  docId: z.string().min(1, "Doc id is required"),
  title: z.string().optional(),
  content: z.string().optional(),
});

export type UpdateDocSchema = z.infer<typeof updateDocSchema>;
