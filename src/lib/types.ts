

export type UserRole = 'admin' | 'evaluator' | 'candidate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

export type QuestionType = 'mcq' | 'puzzle' | 'paragraph' | 'image-mcq' | 'video-mcq';
export type CodeLanguage = 'javascript' | 'python' | 'java' | 'sql' | 'html' | 'css' | 'text';
export type QuestionCategory = 'aptitude' | 'logical' | 'technical' | 'verbal' | 'general';
export type TestCategory = 'Technical' | 'Aptitude' | 'Logical' | 'Verbal' | 'General' | 'Java';


export interface Question {
  id:string;
  testId: string;
  type: QuestionType;
  category: QuestionCategory;
  questionText: string;
  answer: string;
  options?: string[];
  marks: number;
  imageUrl?: string;
  videoUrl?: string;
  language?: CodeLanguage;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  category: TestCategory;
  timeLimit: number; // in minutes
  createdBy: string; // user id
  createdAt: string; // ISO string
  questions: Question[];
  assignedCandidateIds: string[];
  accessCode?: string;
  passingScore: number; 
  evaluationMode: 'automatic' | 'manual';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  mobileNumber?: string;
}

export type ManualEvaluation = {
  score?: number;
  feedback?: string;
};


export interface Submission {
  id: string;
  testId: string;
  candidateId: string;
  answers: Record<string, any>; // questionId: answer
  score: number | null;
  submittedAt: string; // ISO string
  status: 'in-progress' | 'submitted' | 'evaluating' | 'completed';
  result?: 'pass' | 'fail';
  evaluations?: Record<string, ManualEvaluation>;
  timeTaken?: number; // in seconds
}

export type ProctoringStatus = 'present' | 'no_face' | 'multiple_faces' | 'no_sound' | 'high_noise' | 'tab_switch' | 'browser' | 'mobile_phone';

export interface ProctoringLog {
  id: string;
  testId: string;
  candidateId: string;
  timestamp: string; // ISO string
  status: ProctoringStatus;
}

    
