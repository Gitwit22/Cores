import type { ProgramId, TicketId, UserId } from './types';

export type TicketNotificationEvent =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.status.changed'
  | 'ticket.comment.added'
  | 'ticket.overdue'
  | 'ticket.sla.breached'
  | 'ticket.escalated'
  | 'ticket.reopened'
  | 'ticket.payment.required'
  | 'ticket.payment.updated';

export interface TicketNotification {
  event: TicketNotificationEvent;
  ticketId: TicketId;
  programId: ProgramId;
  recipientUserIds?: UserId[];
  recipientTeamIds?: string[];
  payload?: Record<string, unknown>;
}

export interface TicketNotificationPublisher {
  publish(notification: TicketNotification): Promise<void>;
}