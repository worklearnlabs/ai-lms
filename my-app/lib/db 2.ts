import { createStandardServerClient } from '@/utils/supabase';

export async function getAllUsers() {
  const supabase = createStandardServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  return data;
}

export async function createUser(userData: {
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  skillLevel?: string;
  experience?: string;
  learningObjectives?: string[];
  preferredLearningStyle?: string;
}) {
  const supabase = createStandardServerClient();
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();
  
  if (error) throw error;
  return data;
} 