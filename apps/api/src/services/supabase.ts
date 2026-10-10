import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateSupabaseConfig } from '../config/env.js'

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

  if (!validation.config) {
    throw new Error('[Supabase] Configuration is unavailable.')
  }

  const { url, serviceRoleKey } = validation.config

  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseClient
}

export const isSupabaseInitialized = (): boolean => {
  return supabaseClient !== null
}
