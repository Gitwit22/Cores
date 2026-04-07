# ticket-core Roadmap

## Core Framing

`ticket-core` should be positioned as a reusable Request / Case Management engine that can power:

- support desk workflows
- bug and incident intake
- internal operations tasks
- approvals and service requests

## Architectural Direction

- one shared engine with `type` and `programId` for multi-program reuse
- strict separation of ticket status lifecycle and payment lifecycle
- configurable workflows per program (statuses, transitions, queues, SLAs, custom fields)
- role and permission model enforced through policy contracts
- adapter-driven infrastructure (storage, notifications, payments)

## Phase 1 (MVP)

- ticket CRUD contracts and use cases
- configurable status workflow
- assignment (user/team/queue)
- priority and severity model
- public replies and internal notes
- attachments metadata model
- filtering and search contracts
- audit event contracts
- notifications contracts
- `programId` required on records
- admin configuration contracts for categories and statuses

### Payment MVP (Phase 1 Add-on)

- optional `paymentRequired` on ticket creation
- payment intent creation contract
- payment state tracking on ticket
- invoice reference support
- webhook-driven payment update contract
- payment history model tied to `programId`, `ticketId`, `userId`

## Phase 2

- SLA timers and breach tracking
- automation rules and escalations
- dashboards and analytics aggregates
- requester portal contracts
- canned responses and templates
- custom fields framework

## Phase 3

- email-to-ticket ingestion
- advanced analytics and trend reporting
- knowledge base linkage
- AI triage and suggested responses
- cross-program admin monitoring

## Non-Negotiable Design Rules

- keep ticket lifecycle independent from payment lifecycle
- model public comment threads separate from internal notes
- enforce tenant/program isolation at repository boundaries
- make queue routing and escalation rule-driven
- emit auditable, structured events for all critical state changes