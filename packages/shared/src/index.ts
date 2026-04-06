export type Dictionary<TValue = unknown> = Record<string, TValue>;

export type Maybe<TValue> = TValue | null | undefined;

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}