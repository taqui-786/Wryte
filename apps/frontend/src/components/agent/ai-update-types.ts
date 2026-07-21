export type AIStreamStatus = "processing" | "streaming" | "complete";

export type EditorUpdatePayload = {
  id?: string;
  status: AIStreamStatus;
  markdown: string;
};

export type TitleUpdatePayload = {
  id?: string;
  status: AIStreamStatus;
  title: string;
};
