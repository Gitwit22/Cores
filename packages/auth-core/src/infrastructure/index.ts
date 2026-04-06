/**
 * Infrastructure adapters belong here.
 *
 * TODO: Add concrete implementations for repositories, password hashing,
 * token signing, and session persistence.
 */

export interface AuthInfrastructurePlaceholder {
  readonly name: 'auth-infrastructure-placeholder';
}

export const authInfrastructurePlaceholder: AuthInfrastructurePlaceholder = {
  name: 'auth-infrastructure-placeholder',
};

export * from './passwords';
export * from './repositories';
export * from './sessions';
export * from './tokens';