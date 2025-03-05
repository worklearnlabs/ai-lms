export interface ContentItem {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'image';
  content?: string;
  items?: string[];
  language?: string;
  url?: string;
  altText?: string;
} 