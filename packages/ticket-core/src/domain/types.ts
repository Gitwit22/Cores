/**
 * ticket-core/domain/types.ts
 *
 * Core domain types and interfaces for the ticket-core module.
 * These are application-agnostic and must not reference a specific framework,
 * database, or product.
 */

export type TicketId = string;
export type ProgramId = string;
export type UserId = string;
export type TeamId = string;
export type QueueId = string;

export type TicketType =
  | 'support'
  | 'bug-report'
  | 'internal-task'
  | 'service-request'
  | 'incident'
  | 'approval-request'
  | 'custom';

/**
 * Status values are intentionally open-ended so each program can define
 * lifecycle labels and transitions that match its workflow.
 */
export type TicketStatus = string;

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketSource {
  WEB_FORM = 'web-form',
  EMAIL = 'email',
  API = 'api',
  ADMIN = 'admin',
  SYSTEM = 'system',
  CHAT = 'chat',
  IMPORT = 'import',
}

export enum CommentVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
}

export enum TicketPaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting-payment',
  AUTHORIZED = 'authorized',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially-paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum TicketRefundStatus {
  NONE = 'none',
  PENDING = 'pending',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export interface TicketAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: UserId;
  uploadedAt: Date;
}

export interface TicketComment {
  id: string;
  ticketId: TicketId;
  programId: ProgramId;
  authorUserId: UserId;
  body: string;
  visibility: CommentVisibility;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TicketPaymentSnapshot {
  paymentRequired: boolean;
  status: TicketPaymentStatus;
  amount?: number;
  currency?: string;
  method?: string;
  transactionId?: string;
  invoiceId?: string;
  dueAt?: Date;
  paidAt?: Date;
  refundStatus?: TicketRefundStatus;
  quoteAmount?: number;
  depositAmount?: number;
  balanceAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface TicketRelationshipRefs {
  customerId?: string;
  companyId?: string;
  projectId?: string;
  invoiceId?: string;
  incidentId?: string;
  documentId?: string;
  bugId?: string;
  featureId?: string;
  supportSessionId?: string;
}

export interface TicketSlaState {
  firstResponseDueAt?: Date;
  resolutionDueAt?: Date;
  assignmentDueAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  breached: boolean;
}

export interface TicketRecord {
  id: TicketId;
  ticketNumber: string;
  programId: ProgramId;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity?: TicketSeverity;
  category: string;
  requesterId: UserId;
  assignedUserId?: UserId;
  assignedTeamId?: TeamId;
  assignedQueueId?: QueueId;
  source: TicketSource;
  dueAt?: Date;
  slaTargetAt?: Date;
  attachments: TicketAttachment[];
  tags: string[];
  impact?: string;
  environment?: string;
  resolutionSummary?: string;
  closedAt?: Date;
  reopenedCount: number;
  blocker: boolean;
  usersAffectedCount?: number;
  relationships?: TicketRelationshipRefs;
  payment?: TicketPaymentSnapshot;
  customFieldValues?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketInput {
  programId: ProgramId;
  type: TicketType;
  title: string;
  description: string;
  category: string;
  requesterId: UserId;
  source: TicketSource;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  dueAt?: Date;
  tags?: string[];
  blocker?: boolean;
  customFieldValues?: Record<string, unknown>;
  attachments?: TicketAttachment[];
  relationships?: TicketRelationshipRefs;
  payment?: TicketPaymentSnapshot;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  category?: string;
  assignedUserId?: UserId;
  assignedTeamId?: TeamId;
  assignedQueueId?: QueueId;
  dueAt?: Date;
  slaTargetAt?: Date;
  tags?: string[];
  impact?: string;
  environment?: string;
  resolutionSummary?: string;
  blocker?: boolean;
  customFieldValues?: Record<string, unknown>;
}

export interface TicketStatusWorkflow {
  programId: ProgramId;
  initialStatus: TicketStatus;
  statuses: TicketStatus[];
  transitions: Array<{
    from: TicketStatus;
    to: TicketStatus;
    requiresRole?: string;
    requiresPaymentState?: TicketPaymentStatus;
  }>;
}

export interface TicketQueue {
  id: QueueId;
  programId: ProgramId;
  name: string;
  description?: string;
  isDefault: boolean;
  categories?: string[];
}

export interface TicketCustomFieldDefinition {
  id: string;
  programId: ProgramId;
  key: string;
  label: string;
  type: 'text' | 'dropdown' | 'checkbox' | 'date' | 'number' | 'multi-select' | 'reference';
  required: boolean;
  options?: string[];
}

export interface TicketAuditLogEntry {
  id: string;
  ticketId: TicketId;
  programId: ProgramId;
  action: string;
  actorUserId?: UserId;
  occurredAt: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TicketPaymentRecord {
  id: string;
  ticketId: TicketId;
  programId: ProgramId;
  userId: UserId;
  status: TicketPaymentStatus;
  amount?: number;
  currency?: string;
  transactionId?: string;
  invoiceId?: string;
  providerEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketListFilters {
  programId: ProgramId;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  severity?: TicketSeverity[];
  assigneeUserId?: UserId;
  requesterId?: UserId;
  teamId?: TeamId;
  queueId?: QueueId;
  category?: string[];
  tags?: string[];
  source?: TicketSource[];
  overdueOnly?: boolean;
  unresolvedOnly?: boolean;
  slaBreachedOnly?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  keyword?: string;
}

export interface TicketDashboardMetrics {
  programId: ProgramId;
  ticketsCreated: number;
  openCount: number;
  closedCount: number;
  overdueCount: number;
  escalatedCount: number;
  avgFirstResponseSeconds?: number;
  avgResolutionSeconds?: number;
  reopenRate?: number;
  slaComplianceRate?: number;
}

export enum TicketErrorCode {
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  FORBIDDEN = 'TICKET_FORBIDDEN',
  PAYMENT_REQUIRED = 'TICKET_PAYMENT_REQUIRED',
  PAYMENT_FAILED = 'TICKET_PAYMENT_FAILED',
  INVALID_CONFIGURATION = 'TICKET_INVALID_CONFIGURATION',
  VALIDATION_ERROR = 'TICKET_VALIDATION_ERROR',
  UNKNOWN = 'TICKET_UNKNOWN',
}

export interface TicketError {
  code: TicketErrorCode;
  message: string;
  details?: unknown;
}

export function createTicketError(
  code: TicketErrorCode,
  message: string,
  details?: unknown,
): TicketError {
  return { code, message, details };
}