import { supabase } from './supabase';

/**
 * Writes an entry to the activity_log table. Failures are swallowed
 * silently (logging should never block the actual action).
 */
export async function logActivity(message: string) {
  try {
    await supabase.from('activity_log').insert({ message });
  } catch {
    // ignore logging errors
  }
}
