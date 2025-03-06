export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  skill_level?: string | null;
  experience?: string | null;
  learning_objectives?: string | null;
  preferred_learning_style?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends Omit<User, 'id' | 'email' | 'created_at' | 'updated_at'> {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  preferences?: {
    notifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
}

export interface UserUpdateInput extends Partial<UserProfile> {
  full_name?: string;
  phone?: string;
  skill_level?: string;
  experience?: string;
  learning_objectives?: string;
  preferred_learning_style?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
} 