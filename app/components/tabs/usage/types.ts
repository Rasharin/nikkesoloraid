export type UsageTextFontSize = "sm" | "md" | "lg";

export type TextBlock = {
  id: string;
  type: "text";
  content: string;
  fontSize: UsageTextFontSize;
};

export type ImageBlock = {
  id: string;
  type: "image";
  imagePath: string;
  caption: string;
};

export type UsageBlock = TextBlock | ImageBlock;

export type UsagePost = {
  id: string;
  categoryKey: string;
  blocks: UsageBlock[];
  userId: string | null;
  createdAt: number;
  updatedAt: number;
  source: "remote";
};

export type UsageEditorTextBlock = {
  id: string;
  type: "text";
  content: string;
  fontSize: UsageTextFontSize;
};

export type UsageEditorImageBlock = {
  id: string;
  type: "image";
  imagePath: string;
  caption: string;
  file: File | null;
  previewUrl: string;
  isUploading: boolean;
};

export type UsageEditorBlock = UsageEditorTextBlock | UsageEditorImageBlock;

export type UsagePostSubmitPayload = {
  categoryKey: string;
  blocks: UsageEditorBlock[];
};
