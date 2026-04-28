export type DocumentType =
  | "receipt"
  | "invoice"
  | "grant_award_letter"
  | "sponsor_agreement"
  | "contract"
  | "report"
  | "form"
  | "other";

export type DocumentProcessingStatus =
  | "uploaded"
  | "intake_complete"
  | "processing"
  | "complete"
  | "needs_review"
  | "failed";

export interface DocumentRecord {
  id: string;
  orgId: string;
  tenantId?: string;
  programId?: string;
  title: string;
  fileName: string;
  storageKey: string;
  fileUrl?: string;
  mimeType: string;
  size: number;
  documentType: DocumentType;
  processingStatus: DocumentProcessingStatus;
  extractedText?: string;
  extractedMetadata?: Record<string, unknown>;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchDocumentsFilters {
  orgId: string;
  tenantId?: string;
  documentType?: DocumentType;
  programId?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  processingStatus?: DocumentProcessingStatus;
  query?: string;
  uploadedBy?: string;
}
