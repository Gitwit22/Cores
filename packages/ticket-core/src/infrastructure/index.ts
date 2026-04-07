/**
 * Infrastructure adapters belong here.
 *
 * TODO: Add concrete repository, notification, and payment adapters.
 */

export interface TicketInfrastructurePlaceholder {
  readonly name: 'ticket-infrastructure-placeholder';
}

export const ticketInfrastructurePlaceholder: TicketInfrastructurePlaceholder = {
  name: 'ticket-infrastructure-placeholder',
};

export * from './notifications';
export * from './payments';
export * from './repositories';