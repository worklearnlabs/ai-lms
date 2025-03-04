export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'mentor';
  skillLevel?: string;
  experience?: string;
  learningObjectives?: string;
  preferredLearningStyle?: string;
  created_at?: string;
  updated_at?: string;
} 