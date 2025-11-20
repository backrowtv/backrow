"use server";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";

/**
 * Apply notification archiving migration
 * Uses service role key to execute SQL directly
 */
export async function applyNotificationArchivingMigration(): Promise<{
  error?: string;
  success?: boolean;
}> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return { error: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const migrationSQL = `
-- Add archived columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'archived') THEN
    ALTER TABLE public.notifications ADD COLUMN archived BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'archived_at') THEN
    ALTER TABLE public.notifications ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for archived notifications (partial index for better performance)
CREATE INDEX IF NOT EXISTS idx_notifications_archived ON public.notifications(user_id, archived, created_at)
WHERE archived = FALSE;

-- Create function to archive old notifications (30+ days old, read)
CREATE OR REPLACE FUNCTION archive_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET archived = TRUE, archived_at = NOW()
  WHERE archived = FALSE
    AND read = TRUE
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to delete very old archived notifications (90+ days old)
CREATE OR REPLACE FUNCTION delete_old_archived_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE archived = TRUE
    AND archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
`;

  try {
    // Execute SQL using RPC if available, otherwise return instructions
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // RPC might not be available - return instructions for manual application
      return {
        error:
          "RPC method not available. Please apply migration manually via Supabase Dashboard SQL Editor. See docs/project-planning/MIGRATION_APPLY_NOW.md",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to apply migration",
    };
  }
}
