import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Database {
  public: {
    Tables: {
      site_content: {
        Row: {
          id: string
          data: any
          updated_at: string
        }
        Insert: {
          id?: string
          data: any
          updated_at?: string
        }
        Update: {
          id?: string
          data?: any
          updated_at?: string
        }
      }
      monthly_results: {
        Row: {
          id: string
          month: string
          data: any
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          data: any
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          data?: any
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          data: any
          updated_at: string
        }
        Insert: {
          id?: string
          data: any
          updated_at?: string
        }
        Update: {
          id?: string
          data?: any
          updated_at?: string
        }
      }
    }
  }
}
