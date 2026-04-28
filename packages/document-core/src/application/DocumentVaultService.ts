import type { DocumentRecord, SearchDocumentsFilters } from "../domain/types";

export interface UploadDocumentInput {
  orgId: string;
  tenantId?: string;
  programId?: string;
  title?: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  fileUrl?: string;
  documentType?: DocumentRecord["documentType"];
  uploadedBy: string;
  extractedText?: string;
  extractedMetadata?: Record<string, unknown>;
}

export interface DocumentVaultService {
  uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord>;
  searchDocuments(filters: SearchDocumentsFilters): Promise<DocumentRecord[]>;
  getDocumentById(orgId: string, documentId: string): Promise<DocumentRecord | null>;
}
