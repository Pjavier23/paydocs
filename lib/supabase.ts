import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string | null
          type: string
          data_json: Record<string, unknown>
          paid: boolean
          stripe_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          data_json: Record<string, unknown>
          paid?: boolean
          stripe_session_id?: string | null
          created_at?: string
        }
        Update: {
          paid?: boolean
          stripe_session_id?: string | null
        }
      }
    }
  }
}
