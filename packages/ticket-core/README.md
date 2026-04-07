# @nxtlvl/ticket-core

Reusable request and case-management contracts for Nxt Lvl applications.

## Purpose

`ticket-core` defines an application-agnostic foundation for:

- support tickets
- bug reports and incidents
- internal tasks
- service and approval requests
- assignment, queueing, and escalations
- comment threads and internal notes
- SLA tracking contracts
- optional payment-backed workflows

This package separates domain contracts, application use-case orchestration,
configuration, infrastructure adapter seams, and thin UI-facing types.

## Package Layout

- `src/domain` contains business-facing types and contracts.
- `src/application` contains use-case orchestration.
- `src/config` contains configurable policy contracts.
- `src/infrastructure` is reserved for adapter implementations.
- `src/ui` is reserved for thin UI-facing exports.

## Current Starter Concepts

- `TicketRecord`
- `TicketStatusWorkflow`
- `TicketRepository`
- `TicketAuditLogger`
- `TicketNotificationPublisher`
- `TicketPaymentGateway`
- `TicketingConfig`
- `CreateTicketUseCase`

## Payment Design

Payment state is intentionally independent from ticket status. This enables:

- pay-to-submit
- pay-before-resolution
- invoice-linked ticket flows
- webhook-driven status synchronization

## Next Implementation Work

1. Implement a concrete `TicketRepository` adapter in `src/infrastructure`.
2. Implement a payment adapter (for example, Stripe) behind `TicketPaymentGateway`.
3. Implement status transition enforcement against configured workflow transitions.
4. Add SLA timers and automation rules around the current contracts.