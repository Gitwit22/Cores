import type {
  CreateTicketInput,
  TicketAuditLogEntry,
  TicketComment,
  TicketCustomFieldDefinition,
  TicketDashboardMetrics,
  TicketId,
  TicketListFilters,
  TicketPaymentRecord,
  TicketQueue,
  TicketRecord,
  TicketStatusWorkflow,
  UpdateTicketInput,
} from './types';

/**
 * TicketRepository defines the persistence contract for ticket-core.
 */
export interface TicketRepository {
  createTicket(input: CreateTicketInput): Promise<TicketRecord>;
  findTicketById(ticketId: TicketId, programId: string): Promise<TicketRecord | undefined>;
  listTickets(filters: TicketListFilters): Promise<TicketRecord[]>;
  updateTicket(ticketId: TicketId, programId: string, patch: UpdateTicketInput): Promise<TicketRecord>;
  deleteTicket(ticketId: TicketId, programId: string): Promise<void>;

  addComment(comment: Omit<TicketComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TicketComment>;
  listComments(ticketId: TicketId, programId: string): Promise<TicketComment[]>;

  appendAuditEntry(entry: Omit<TicketAuditLogEntry, 'id'>): Promise<void>;
  listAuditEntries(ticketId: TicketId, programId: string): Promise<TicketAuditLogEntry[]>;

  savePaymentRecord(record: Omit<TicketPaymentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  listPaymentRecords(ticketId: TicketId, programId: string): Promise<TicketPaymentRecord[]>;

  getWorkflow(programId: string): Promise<TicketStatusWorkflow>;
  upsertWorkflow(workflow: TicketStatusWorkflow): Promise<void>;

  listQueues(programId: string): Promise<TicketQueue[]>;
  upsertQueue(queue: TicketQueue): Promise<void>;

  listCustomFieldDefinitions(programId: string): Promise<TicketCustomFieldDefinition[]>;
  upsertCustomFieldDefinition(field: TicketCustomFieldDefinition): Promise<void>;

  getDashboardMetrics(programId: string): Promise<TicketDashboardMetrics>;
}