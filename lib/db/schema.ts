import { pgTable, uuid, char, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  letter: char('letter', { length: 1 }).notNull().unique(),
  artistName: text('artist_name').notNull(),
  subject: text('subject').notNull(),
  imageUrl: text('image_url').notNull(),
  strokeData: jsonb('stroke_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const letterLocks = pgTable('letter_locks', {
  letter: char('letter', { length: 1 }).primaryKey(),
  lockToken: uuid('lock_token').notNull(),
  artistName: text('artist_name'),
  subject: text('subject'),
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Entry = typeof entries.$inferSelect;
export type LetterLock = typeof letterLocks.$inferSelect;
