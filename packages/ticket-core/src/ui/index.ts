/**
 * Thin UI-facing exports belong here.
 */

export interface TicketComposerViewModel {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isSubmitting: boolean;
  errorMessage?: string;
}