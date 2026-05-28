export type Priority = 'high' | 'medium' | 'low';

export interface Subject {
  id: string;
  name: string;
  priority: Priority;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  priority: Priority;
  understandingLevel: number;
}

export type StudyTaskType = 'new_learning' | 'review' | 'questions' | 'mistake_review' | 'memo';

export interface StudyTask {
  id: string;
  date?: string;
  scheduledDate: string;
  originalDate?: string;
  type: StudyTaskType;
  subjectId?: string;
  topicId?: string;
  title: string;
  estimatedMinutes: number;
  priority: Priority;
  status: 'todo' | 'done' | 'skipped';
  createdAt: string;
  carriedOverCount: number;
  isFixedDateTask: boolean;
  generated?: boolean;
}

export interface StudyLog {
  id: string;
  date: string;
  topicId?: string;
  minutes: number;
  memo?: string;
}

export interface QuestionLog {
  id: string;
  date: string;
  subjectId: string;
  topicId: string;
  sourceType: 'past_exam' | 'workbook' | 'mock_exam' | 'self_made';
  result: 'correct' | 'incorrect';
  confidence: 'high' | 'medium' | 'low';
  mistakeReason?: string;
  memo?: string;
  sourceRef?: string;
}

export interface ReviewItem {
  id: string;
  topicId: string;
  dueDate: string;
  status: 'pending' | 'done';
  reviewCount: number;
  lastResult?: 'easy' | 'normal' | 'hard' | 'forgot';
}

export interface Material {
  id: string;
  title: string;
  type: 'textbook' | 'workbook' | 'video' | 'website' | 'mock_exam';
  note?: string;
}

export interface MaterialUnit {
  id: string;
  materialId: string;
  subjectId: string;
  topicId?: string;
  chapterTitle: string;
  pageRange?: string;
  status: 'not_started' | 'in_progress' | 'read' | 'practicing' | 'needs_review' | 'completed';
}

export interface Resource {
  id: string;
  title: string;
  type: 'official' | 'law' | 'youtube' | 'textbook' | 'workbook' | 'website';
  subjectId: string;
  topicId?: string;
  url?: string;
  description?: string;
  status: 'not_started' | 'using' | 'completed' | 'reference';
  memo?: string;
}

export interface ExamSettings {
  examDate: string;
  studyStartDate: string;
  weekdayAvailableMinutes: number;
  weekendAvailableMinutes: number;
  applicationStatus: 'not_started' | 'open' | 'completed' | 'waiting_ticket' | 'final_check';
  preferredApplicationMethod: 'internet' | 'postal' | 'undecided';
}

export interface AppData {
  subjects: Subject[];
  topics: Topic[];
  tasks: StudyTask[];
  studyLogs: StudyLog[];
  questionLogs: QuestionLog[];
  reviewItems: ReviewItem[];
  materials: Material[];
  materialUnits: MaterialUnit[];
  resources: Resource[];
  settings: ExamSettings;
}
