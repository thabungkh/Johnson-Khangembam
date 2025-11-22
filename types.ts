export enum DocType {
  PYQ = 'Previous Year Questions (Mains/Prelims)',
  MAIN = 'Main Topic Notes (e.g., Mrunal)',
  NCERT = 'Basic Concepts (NCERT)',
  CURRENT = 'Current Affairs'
}

export interface UploadedFile {
  id: string;
  type: DocType;
  name: string;
  base64: string; // Base64 encoded content without prefix for API
  mimeType: string;
}

export interface Topic {
  id: string;
  name: string;
  relevance: string;
  complexity: string;
  subtopics: string[];
}

export interface GeneratedContent {
  topicId: string;
  markdown: string;
  isLoading: boolean;
  error?: string;
}

export type ViewState = 'UPLOAD' | 'DASHBOARD' | 'STUDY';