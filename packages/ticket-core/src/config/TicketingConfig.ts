import { TicketPriority, TicketStatus, TicketType } from '../domain/types';

export interface TicketingConfig {
  defaultType: TicketType;
  defaultPriority: TicketPriority;
  defaultStatus: TicketStatus;
  allowExternalRequesters: boolean;
  allowTicketDelete: boolean;
  requirePaymentBeforeAssignment: boolean;
  requirePaymentBeforeResolution: boolean;
  enableSlaTracking: boolean;
  enableAutomationRules: boolean;
  maxAttachmentSizeBytes: number;
  allowedAttachmentMimeTypes: string[];
}

export const defaultTicketingConfig: TicketingConfig = {
  defaultType: 'support',
  defaultPriority: TicketPriority.MEDIUM,
  defaultStatus: 'new',
  allowExternalRequesters: true,
  allowTicketDelete: false,
  requirePaymentBeforeAssignment: false,
  requirePaymentBeforeResolution: false,
  enableSlaTracking: false,
  enableAutomationRules: false,
  maxAttachmentSizeBytes: 10 * 1024 * 1024,
  allowedAttachmentMimeTypes: [
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain',
    'application/zip',
  ],
};