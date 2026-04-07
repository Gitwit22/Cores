import { randomUUID } from 'node:crypto';

import type { TicketingConfig } from '../../config/TicketingConfig';
import type { TicketAuditLogger } from '../../domain/TicketAuditLogger';
import type { TicketNotificationPublisher } from '../../domain/TicketNotificationPublisher';
import type { TicketPaymentGateway } from '../../domain/TicketPaymentGateway';
import type { TicketRepository } from '../../domain/TicketRepository';
import {
  TicketErrorCode,
  TicketPaymentStatus,
  createTicketError,
  type CreateTicketInput,
  type TicketRecord,
} from '../../domain/types';

export interface CreateTicketUseCaseDependencies {
  repository: TicketRepository;
  auditLogger: TicketAuditLogger;
  notificationPublisher: TicketNotificationPublisher;
  config: TicketingConfig;
  paymentGateway?: TicketPaymentGateway;
  createId?: () => string;
  now?: () => Date;
}

export type CreateTicketResult =
  | {
      success: true;
      ticket: TicketRecord;
      paymentIntentId?: string;
    }
  | {
      success: false;
      error: ReturnType<typeof createTicketError>;
    };

export class CreateTicketUseCase {
  private readonly repository: TicketRepository;
  private readonly auditLogger: TicketAuditLogger;
  private readonly notificationPublisher: TicketNotificationPublisher;
  private readonly config: TicketingConfig;
  private readonly paymentGateway?: TicketPaymentGateway;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(dependencies: CreateTicketUseCaseDependencies) {
    this.repository = dependencies.repository;
    this.auditLogger = dependencies.auditLogger;
    this.notificationPublisher = dependencies.notificationPublisher;
    this.config = dependencies.config;
    this.paymentGateway = dependencies.paymentGateway;
    this.createId = dependencies.createId ?? (() => randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async execute(input: CreateTicketInput): Promise<CreateTicketResult> {
    if (!input.title.trim()) {
      return {
        success: false,
        error: createTicketError(
          TicketErrorCode.VALIDATION_ERROR,
          'A ticket title is required.',
        ),
      };
    }

    if (!input.description.trim()) {
      return {
        success: false,
        error: createTicketError(
          TicketErrorCode.VALIDATION_ERROR,
          'A ticket description is required.',
        ),
      };
    }

    let paymentIntentId: string | undefined;

    if (input.payment?.paymentRequired) {
      if (!this.paymentGateway) {
        return {
          success: false,
          error: createTicketError(
            TicketErrorCode.INVALID_CONFIGURATION,
            'Payment is required but no payment gateway is configured.',
          ),
        };
      }

      if (!input.payment.amount || !input.payment.currency) {
        return {
          success: false,
          error: createTicketError(
            TicketErrorCode.VALIDATION_ERROR,
            'Payment amount and currency are required when payment is enabled.',
          ),
        };
      }
    }

    const createdTicket = await this.repository.createTicket({
      ...input,
      priority: input.priority ?? this.config.defaultPriority,
      payment: input.payment
        ? {
            ...input.payment,
            status: input.payment.status ?? TicketPaymentStatus.PENDING,
          }
        : input.payment,
      tags: input.tags ?? [],
      attachments: input.attachments ?? [],
      blocker: input.blocker ?? false,
    });

    if (createdTicket.payment?.paymentRequired && this.paymentGateway) {
      const amount = createdTicket.payment.amount;
      const currency = createdTicket.payment.currency;

      if (!amount || !currency) {
        return {
          success: false,
          error: createTicketError(
            TicketErrorCode.VALIDATION_ERROR,
            'Created ticket has invalid payment details.',
          ),
        };
      }

      const paymentIntent = await this.paymentGateway.createPaymentIntent({
        programId: createdTicket.programId,
        ticketId: createdTicket.id,
        userId: createdTicket.requesterId,
        amount,
        currency,
        description: `Payment for ticket ${createdTicket.ticketNumber}`,
      });

      paymentIntentId = paymentIntent.paymentIntentId;

      await this.repository.savePaymentRecord({
        ticketId: createdTicket.id,
        programId: createdTicket.programId,
        userId: createdTicket.requesterId,
        status: paymentIntent.status,
        amount,
        currency,
        transactionId: paymentIntent.paymentIntentId,
      });

      await this.notificationPublisher.publish({
        event: 'ticket.payment.required',
        ticketId: createdTicket.id,
        programId: createdTicket.programId,
        recipientUserIds: [createdTicket.requesterId],
        payload: {
          amount,
          currency,
          paymentIntentId,
        },
      });
    }

    await this.auditLogger.log({
      action: 'ticket.created',
      ticketId: createdTicket.id,
      programId: createdTicket.programId,
      actorUserId: createdTicket.requesterId,
      occurredAt: this.now(),
      details: {
        ticketType: createdTicket.type,
        source: createdTicket.source,
      },
    });

    await this.notificationPublisher.publish({
      event: 'ticket.created',
      ticketId: createdTicket.id,
      programId: createdTicket.programId,
      payload: {
        category: createdTicket.category,
        priority: createdTicket.priority,
      },
    });

    const _traceId = this.createId();
    void _traceId;

    return {
      success: true,
      ticket: createdTicket,
      paymentIntentId,
    };
  }
}