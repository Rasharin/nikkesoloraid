export type ContactPostVisibility = "public" | "private";
export type ContactPostStatus = "received" | "resolved";

export type ContactPostSummary = {
  id: string;
  title: string;
  visibility: ContactPostVisibility;
  status: ContactPostStatus;
  createdAt: number;
  updatedAt: number;
  userId: string | null;
  hasReply: boolean;
  canOpen: boolean;
};

export type ContactPostDetail = ContactPostSummary & {
  content: string;
  replyContent: string | null;
  repliedAt: number | null;
};

export const CONTACT_STATUS_LABELS: Record<ContactPostStatus, string> = {
  received: "접수중",
  resolved: "해결완료",
};

export const CONTACT_VISIBILITY_LABELS: Record<ContactPostVisibility, string> = {
  public: "공개",
  private: "비공개",
};

export function isContactPostVisibility(value: unknown): value is ContactPostVisibility {
  return value === "public" || value === "private";
}

export function isContactPostStatus(value: unknown): value is ContactPostStatus {
  return value === "received" || value === "resolved";
}
