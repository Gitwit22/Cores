import type { ProgramId, TicketId, UserId } from './types';

export type TicketAuditAction =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.assigned'
  | 'ticket.status.changed'
  | 'ticket.priority.changed'
  | 'ticket.comment.added'
  | 'ticket.note.added'
  | 'ticket.escalated'
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'ticket.reopened'
  | 'ticket.payment.updated';

export interface TicketAuditEvent {
  action: TicketAuditAction;
  ticketId: TicketId;
  programId: ProgramId;
  occurredAt: Date;
  actorUserId?: UserId;
  details?: Record<string, unknown>;
}

export interface TicketAuditLogger {
  log(event: TicketAuditEvent): Promise<void>;
}