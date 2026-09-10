import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const runs=sqliteTable('runs',{id:text('id').primaryKey(),version:integer('version').notNull(),startedAt:integer('started_at').notNull(),stage:integer('stage').notNull().default(0),score:integer('score').notNull().default(0),finishedAt:integer('finished_at'),elapsedMs:integer('elapsed_ms')});
export const records=sqliteTable('records',{id:text('id').primaryKey().references(()=>runs.id),version:integer('version').notNull(),name:text('name').notNull(),score:integer('score').notNull(),elapsedMs:integer('elapsed_ms').notNull(),createdAt:integer('created_at').notNull()},t=>[index('idx_records_ranking').on(t.version,sql`${t.score} desc`,t.elapsedMs,t.createdAt)]);
