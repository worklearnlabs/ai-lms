export interface ContentItem {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image' | 'step';
  content?: string;
  items?: string[];
  language?: string;
  url?: string;
  altText?: string;
  step?: Step;
}

export interface Step {
  number: number;
  title: string;
  estimatedTime: string;
  instructions: string[];
  toolTags: string[];
  completed?: boolean;
} 