import { createClient } from '@supabase/supabase-js'
import { validateSupabaseConfig } from '../config/env.js'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient
  }

  const validation = validateSupabaseConfig()

  if (!validation.valid) {
    throw new Error(
      `[Supabase] Configuration error: ${validation.message}`,
    )
  }

  const { config } = validation

  supabaseClient = createClient(
    config.url,
    config.serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  return supabaseClient
}

export const isSupabaseInitialized = (): boolean => {
  return supabaseClient !== null
}
