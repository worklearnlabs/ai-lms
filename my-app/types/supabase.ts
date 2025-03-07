export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          skill_level: string | null
          experience: string | null
          learning_objectives: string | null
          preferred_learning_style: string | null
          created_at: string
          updated_at: string
          role: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          skill_level?: string | null
          experience?: string | null
          learning_objectives?: string | null
          preferred_learning_style?: string | null
          created_at?: string
          updated_at?: string
          role?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          skill_level?: string | null
          experience?: string | null
          learning_objectives?: string | null
          preferred_learning_style?: string | null
          created_at?: string
          updated_at?: string
          role?: string
        }
      }
      blueprints: {
        Row: {
          id: number
          user_id: string
          title: string
          description: string | null
          content: Json
          status: string
          is_automated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          description?: string | null
          content: Json
          status?: string
          is_automated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          description?: string | null
          content?: Json
          status?: string
          is_automated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: number
          title: string
          description: string | null
          content: Json | null
          author_id: string
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          content?: Json | null
          author_id: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          content?: Json | null
          author_id?: string
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: number
          user_id: string
          course_id: number
          progress: number | null
          completed: boolean
          enrolled_at: string
        }
        Insert: {
          id?: number
          user_id: string
          course_id: number
          progress?: number | null
          completed?: boolean
          enrolled_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          course_id?: number
          progress?: number | null
          completed?: boolean
          enrolled_at?: string
        }
      }
      interactions: {
        Row: {
          id: number
          user_id: string
          prompt: string
          refined_query: string
          answer: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          prompt: string
          refined_query: string
          answer: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          prompt?: string
          refined_query?: string
          answer?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 