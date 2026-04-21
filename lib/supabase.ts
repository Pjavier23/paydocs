import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => createClientComponentClient()

export const createServerClient = () =>
  createServerComponentClient({ cookies })

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
