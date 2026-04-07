import type { ProgramId, TicketId, TicketPaymentStatus, UserId } from './types';

export interface CreateTicketPaymentIntentInput {
  programId: ProgramId;
  ticketId: TicketId;
  userId: UserId;
  amount: number;
  currency: string;
  description?: string;
}

export interface TicketPaymentIntent {
  paymentIntentId: string;
  clientSecret?: string;
  status: TicketPaymentStatus;
}

export interface TicketPaymentGateway {
  createPaymentIntent(input: CreateTicketPaymentIntentInput): Promise<TicketPaymentIntent>;
  createInvoice(input: CreateTicketPaymentIntentInput): Promise<{ invoiceId: string }>;
  refundPayment(transactionId: string, amount?: number): Promise<{ refundId: string }>;
}