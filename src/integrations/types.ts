export type IntegrationFile = {
  path: string;
  content: string;
  description: string;
};

export type ConflictAction = "append" | "sidecar" | "skip" | "overwrite";
