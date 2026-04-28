import type { DocumentEntityType, DocumentLinkRecord, DocumentLinkType } from "../domain/types";

export interface LinkedDocumentRecord {
  id: string;
  orgId: string;
  tenantId?: string;
  title: string;
  fileName: string;
  storageKey: string;
  fileUrl?: string;
  mimeType: string;
  size: number;
  documentType:
    | "receipt"
    | "invoice"
    | "grant_award_letter"
    | "sponsor_agreement"
    | "contract"
    | "report"
    | "form"
    | "other";
  processingStatus:
    | "uploaded"
    | "intake_complete"
    | "processing"
    | "complete"
    | "needs_review"
    | "failed";
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkDocumentInput {
  orgId: string;
  tenantId?: string;
  documentId: string;
  entityType: DocumentEntityType;
  entityId: string;
  linkType: DocumentLinkType;
  createdBy: string;
  notes?: string;
  sourceContext?: string;
}

export interface UploadAndLinkInput {
  orgId: string;
  tenantId?: string;
  entityType: DocumentEntityType;
  entityId: string;
  linkType: DocumentLinkType;
  createdBy: string;
  notes?: string;
  sourceContext?: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  fileUrl?: string;
  title?: string;
  documentType?: LinkedDocumentRecord["documentType"];
}

export interface UniversalAttachmentService {
  linkDocumentToEntity(input: LinkDocumentInput): Promise<DocumentLinkRecord>;
  attachExistingDocument(input: LinkDocumentInput): Promise<DocumentLinkRecord>;
  uploadAndLinkDocument(input: UploadAndLinkInput): Promise<{
    document: LinkedDocumentRecord;
    link: DocumentLinkRecord;
  }>;
  getDocumentsForEntity(
    orgId: string,
    entityType: DocumentEntityType,
    entityId: string,
    linkType?: DocumentLinkType,
  ): Promise<Array<{ document: LinkedDocumentRecord; link: DocumentLinkRecord }>>;
  getDocumentLinks(orgId: string, documentId: string): Promise<DocumentLinkRecord[]>;
  detachDocumentLink(orgId: string, linkId: string): Promise<void>;
}
