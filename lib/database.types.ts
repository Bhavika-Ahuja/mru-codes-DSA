/**
 * Re-export all database types from types/database.ts
 * This file exists for backwards compatibility with existing imports
 */

export * from '@/types/database';

// Re-export Database as default for Supabase client usage
export type { Database } from '@/types/database';
