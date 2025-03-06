// Blueprint-related types
export interface Blueprint {
  id: number;
  userId: number;
  title: string;
  description?: string;
  content: BlueprintContent;
  status: 'draft' | 'in_progress' | 'completed';
  isAutomated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlueprintContent {
  steps: BlueprintStep[];
  objectives: string[];
  resources?: string[];
  estimatedTime?: string;
}

export interface BlueprintStep {
  id: string;
  title: string;
  description: string;
  instructions: string;
  validationCriteria?: string[];
  isCompleted: boolean;
}

// Course-related types
export interface Course {
  id: number;
  title: string;
  description?: string;
  content: CourseContent;
  authorId: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseContent {
  modules: CourseModule[];
  objectives: string[];
  prerequisites?: string[];
  estimatedDuration?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  content: string;
  resources?: string[];
  quiz?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// AI-related types
export interface AIServiceResponse {
  content: string | null;
  provider: 'openai' | 'anthropic' | 'perplexity';
}

export interface BlueprintGenerationParams {
  title: string;
  description: string;
  objectives: string[];
  userSkillLevel?: string;
  userExperience?: string;
} 