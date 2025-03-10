export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VisibilityType = 'private' | 'public' | 'team';
export type SkillLevelType = 'beginner' | 'intermediate' | 'advanced';
export type ComplexityType = 'low' | 'medium' | 'high';
export type StepStatusType = 'not_started' | 'in_progress' | 'completed';
export type SessionStatusType = 'active' | 'completed' | 'failed';
export type MessageRoleType = 'system' | 'user' | 'assistant';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          skill_level: string | null;
          experience: string | null;
          learning_objectives: string | null;
          preferred_learning_style: string | null;
          created_at: string;
          updated_at: string;
          role: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          skill_level?: string | null;
          experience?: string | null;
          learning_objectives?: string | null;
          preferred_learning_style?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          skill_level?: string | null;
          experience?: string | null;
          learning_objectives?: string | null;
          preferred_learning_style?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: string;
        };
      };
      
      // Enhanced blueprints table
      blueprints: {
        Row: {
          id: string; // Changed from number to string (UUID)
          user_id: string;
          title: string;
          description: string | null;
          content: Json;
          status: string;
          is_automated: boolean;
          created_at: string;
          updated_at: string;
          // New fields
          search_query: string | null;
          visibility: VisibilityType;
          team_id: string | null;
          skill_level: SkillLevelType | null;
          learning_objective: string | null;
          complexity: ComplexityType | null;
          estimated_time: string | null;
          prompt: string | null;
          clone_count: number;
          steps_count: number | null;
          is_verified: boolean;
        };
        Insert: {
          id?: string; // Changed from number to string (UUID)
          user_id: string;
          title: string;
          description?: string | null;
          content: Json;
          status?: string;
          is_automated?: boolean;
          created_at?: string;
          updated_at?: string;
          // New fields
          search_query?: string | null;
          visibility?: VisibilityType;
          team_id?: string | null;
          skill_level?: SkillLevelType | null;
          learning_objective?: string | null;
          complexity?: ComplexityType | null;
          estimated_time?: string | null;
          prompt?: string | null;
          clone_count?: number;
          steps_count?: number | null;
          is_verified?: boolean;
        };
        Update: {
          id?: string; // Changed from number to string (UUID)
          user_id?: string;
          title?: string;
          description?: string | null;
          content?: Json;
          status?: string;
          is_automated?: boolean;
          created_at?: string;
          updated_at?: string;
          // New fields
          search_query?: string | null;
          visibility?: VisibilityType;
          team_id?: string | null;
          skill_level?: SkillLevelType | null;
          learning_objective?: string | null;
          complexity?: ComplexityType | null;
          estimated_time?: string | null;
          prompt?: string | null;
          clone_count?: number;
          steps_count?: number | null;
          is_verified?: boolean;
        };
      };
      
      // New blueprint_steps table
      blueprint_steps: {
        Row: {
          id: string;
          blueprint_id: string;
          number: number;
          title: string;
          estimated_time: string | null;
          instructions: Json | null;
          tools: Json | null;
          status: StepStatusType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          blueprint_id: string;
          number: number;
          title: string;
          estimated_time?: string | null;
          instructions?: Json | null;
          tools?: Json | null;
          status?: StepStatusType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          blueprint_id?: string;
          number?: number;
          title?: string;
          estimated_time?: string | null;
          instructions?: Json | null;
          tools?: Json | null;
          status?: StepStatusType;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      // New blueprint_subtasks table
      blueprint_subtasks: {
        Row: {
          id: string;
          step_id: string;
          task_number: number;
          description: string;
          status: StepStatusType;
          estimated_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          step_id: string;
          task_number: number;
          description: string;
          status?: StepStatusType;
          estimated_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          step_id?: string;
          task_number?: number;
          description?: string;
          status?: StepStatusType;
          estimated_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      // New blueprint_comments table
      blueprint_comments: {
        Row: {
          id: string;
          blueprint_id: string;
          step_id: string | null;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blueprint_id: string;
          step_id?: string | null;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blueprint_id?: string;
          step_id?: string | null;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      
      // New reasoning_sessions table
      reasoning_sessions: {
        Row: {
          id: string;
          blueprint_id: string;
          status: SessionStatusType;
          context: Json | null;
          skill_level: SkillLevelType | null;
          learning_objective: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          blueprint_id: string;
          status?: SessionStatusType;
          context?: Json | null;
          skill_level?: SkillLevelType | null;
          learning_objective?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          blueprint_id?: string;
          status?: SessionStatusType;
          context?: Json | null;
          skill_level?: SkillLevelType | null;
          learning_objective?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      // New reasoning_messages table
      reasoning_messages: {
        Row: {
          id: string;
          session_id: string;
          role: MessageRoleType;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: MessageRoleType;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: MessageRoleType;
          content?: string;
          created_at?: string;
        };
      };
      
      courses: {
        Row: {
          id: number;
          title: string;
          description: string | null;
          content: Json | null;
          author_id: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          description?: string | null;
          content?: Json | null;
          author_id: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          description?: string | null;
          content?: Json | null;
          author_id?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      enrollments: {
        Row: {
          id: number;
          user_id: string;
          course_id: number;
          progress: number | null;
          completed: boolean;
          enrolled_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          course_id: number;
          progress?: number | null;
          completed?: boolean;
          enrolled_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          course_id?: number;
          progress?: number | null;
          completed?: boolean;
          enrolled_at?: string;
        };
      };
      
      interactions: {
        Row: {
          id: number;
          user_id: string;
          prompt: string;
          refined_query: string;
          answer: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          prompt: string;
          refined_query: string;
          answer: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          prompt?: string;
          refined_query?: string;
          answer?: string;
          created_at?: string;
        };
      };
    };
    
    Views: {
      [_ in never]: never;
    };
    
    Functions: {
      [_ in never]: never;
    };
    
    Enums: {
      visibility_type: VisibilityType;
      skill_level_type: SkillLevelType;
      complexity_type: ComplexityType;
      step_status_type: StepStatusType;
      session_status_type: SessionStatusType;
      message_role_type: MessageRoleType;
    };
  };
} 