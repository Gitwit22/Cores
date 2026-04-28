export const DOCUMENT_ENTITY_TYPES = [
  "program",
  "expense",
  "grant",
  "sponsor",
  "fundraising",
  "event",
  "staff",
  "volunteer",
  "time_entry",
  "finance_submission",
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export const DOCUMENT_LINK_TYPES = [
  "attachment",
  "receipt",
  "invoice",
  "agreement",
  "award_letter",
  "report",
  "reimbursement_backup",
  "proof",
  "logo",
  "tax_form",
  "payment_confirmation",
  "supporting_document",
] as const;

export type DocumentLinkType = (typeof DOCUMENT_LINK_TYPES)[number];

export interface DocumentLinkRecord {
  id: string;
  orgId: string;
  tenantId?: string;
  documentId: string;
  entityType: DocumentEntityType;
  entityId: string;
  linkType: DocumentLinkType;
  createdBy: string;
  createdAt: string;
  notes?: string;
  sourceContext?: string;
}

export function isDocumentEntityType(value: unknown): value is DocumentEntityType {
  return typeof value === "string" && DOCUMENT_ENTITY_TYPES.includes(value as DocumentEntityType);
}

export function isDocumentLinkType(value: unknown): value is DocumentLinkType {
  return typeof value === "string" && DOCUMENT_LINK_TYPES.includes(value as DocumentLinkType);
}
