export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      blueprints: {
        Row: {
          clone_count: number | null
          content: Json
          created_at: string
          details: string | null
          id: string
          is_verified: boolean | null
          prompt: string | null
          steps_count: number | null
          title: string
          updated_at: string
          user_id: string | null
          search_query: string | null
        }
        Insert: {
          clone_count?: number | null
          content: Json
          created_at?: string
          details?: string | null
          id?: string
          is_verified?: boolean | null
          prompt?: string | null
          steps_count?: number | null
          title: string
          updated_at?: string
          user_id?: string | null
          search_query?: string | null
        }
        Update: {
          clone_count?: number | null
          content?: Json
          created_at?: string
          details?: string | null
          id?: string
          is_verified?: boolean | null
          prompt?: string | null
          steps_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
          search_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_research: {
        Row: {
          id: string
          blueprint_id: string
          search_query: string
          research_data: Json
          sources: Json
          usage_metrics: Json
          status: string // research_status_type
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          blueprint_id: string
          search_query: string
          research_data: Json
          sources: Json
          usage_metrics: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          blueprint_id?: string
          search_query?: string
          research_data?: Json
          sources?: Json
          usage_metrics?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_research_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprints"
            referencedColumns: ["id"]
          }
        ]
      }
      businesses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          name: string
          size: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          author_id: string | null
          content: Json | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          id: string
          is_published?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed: boolean | null
          course_id: string
          enrolled_at: string
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          experience: Database["public"]["Enums"]["experience_level"] | null
          first_name: string
          id: string
          last_name: string | null
          learning_objectives: string | null
          preferred_learning_style: string | null
          role: string
          skill_level: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          first_name: string
          id?: string
          last_name?: string | null
          learning_objectives?: string | null
          preferred_learning_style?: string | null
          role?: string
          skill_level?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          first_name?: string
          id?: string
          last_name?: string | null
          learning_objectives?: string | null
          preferred_learning_style?: string | null
          role?: string
          skill_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      experience_level:
        | "Basic (little to no experience with AI tools)"
        | "Intermediate (some experience with AI tools)"
        | "Advanced (use AI tools on a daily basis)"
        | "Specialist (deep expertise in using AI tools)"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
