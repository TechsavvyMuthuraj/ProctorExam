
import type { User, Candidate, Test, Submission, ProctoringLog } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const users: User[] = [
  { id: 'user-1', name: 'Admin', email: 'admin@proctor.com', role: 'admin', avatarUrl: '' },
  { id: 'user-2', name: 'Eva Luator', email: 'eva@proctor.com', role: 'evaluator', avatarUrl: '' },
];

export const candidates: Candidate[] = [
  { id: 'cand-1', name: 'Alice Johnson', email: 'alice@example.com', avatarUrl: '' },
  { id: 'cand-2', name: 'Bob Williams', email: 'bob@example.com', avatarUrl: '' },
  { id: 'cand-3', name: 'Charlie Brown', email: 'charlie@example.com', avatarUrl: '' },
];

export const tests: Test[] = [
  {
    id: 'test-1',
    title: 'Frontend Developer Assessment',
    description: 'A comprehensive test for frontend development skills.',
    category: 'Technical',
    timeLimit: 60,
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCandidateIds: ['cand-1', 'cand-2'],
    accessCode: 'FRONT123',
    passingScore: 20,
    evaluationMode: 'manual',
    questions: [
      { id: 'q1', testId: 'test-1', type: 'mcq', category: 'technical', questionText: 'What is React?', options: ['A library', 'A framework', 'A language'], answer: 'A library', marks: 10 },
      { id: 'q2', testId: 'test-1', type: 'puzzle', category: 'technical', questionText: 'Write a function to reverse a string.', answer: 'function reverse(str) {\n  return str.split("").reverse().join("");\n}', language: 'javascript', marks: 20 },
    ],
  },
  {
    id: 'test-2',
    title: 'Backend Engineering Challenge',
    description: 'Evaluate backend engineering principles and coding.',
    category: 'Technical',
    timeLimit: 90,
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCandidateIds: ['cand-3'],
    accessCode: 'BACK456',
    passingScore: 40,
    evaluationMode: 'manual',
    questions: [
      { id: 'q3', testId: 'test-2', type: 'paragraph', category: 'technical', questionText: 'Explain the difference between SQL and NoSQL databases.', answer: 'SQL databases are relational, use structured query language and have a predefined schema. NoSQL databases are non-relational, have dynamic schemas for unstructured data.', marks: 25 },
      { id: 'q4', testId: 'test-2', type: 'puzzle', category: 'technical', questionText: 'Implement a REST API endpoint for user creation.', language: 'javascript', marks: 35 },
    ],
  },
  {
    id: 'mcq-test-3',
    title: 'General Knowledge Quiz',
    description: 'A quick quiz to test general knowledge.',
    category: 'General',
    timeLimit: 15,
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignedCandidateIds: ['cand-1', 'cand-2', 'cand-3'],
    accessCode: 'QUIZ101',
    passingScore: 20,
    evaluationMode: 'automatic',
    questions: [
        { id: 'q5', testId: 'mcq-test-3', type: 'mcq', category: 'general', questionText: 'What is the capital of France?', options: ['Berlin', 'Madrid', 'Paris', 'Rome'], answer: 'Paris', marks: 10 },
        { id: 'q6', testId: 'mcq-test-3', type: 'mcq', category: 'logical', questionText: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 'Mars', marks: 10 },
        { id: 'q7', testId: 'mcq-test-3', type: 'mcq', category: 'aptitude', questionText: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 'Pacific', marks: 10 },
    ],
  }
];

export const submissions: Submission[] = [
  { id: 'sub-1', testId: 'test-1', candidateId: 'cand-1', answers: { q1: 'A library', q2: 'function reverse(s){ return s.split("").reverse().join(""); }' }, score: 28, status: 'completed', submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), result: 'fail' },
  { id: 'sub-2', testId: 'test-1', candidateId: 'cand-2', answers: { q1: 'A framework', q2: '...' }, score: null, status: 'evaluating', submittedAt: new Date().toISOString() },
  { id: 'sub-3', testId: 'test-2', candidateId: 'cand-3', answers: { q3: '...', q4: '...' }, score: null, status: 'evaluating', submittedAt: new Date().toISOString() },
];

export const proctoringLogs: ProctoringLog[] = [
  // Logs for Charlie Brown's test (cand-3, test-2)
  { id: 'log-1', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString(), status: 'present' },
  { id: 'log-2', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(), status: 'present' },
  { id: 'log-3', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(), status: 'no_face' },
  { id: 'log-4', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 69 * 60 * 1000).toISOString(), status: 'no_face' },
  { id: 'log-5', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 68 * 60 * 1000).toISOString(), status: 'present' },
  { id: 'log-6', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(), status: 'multiple_faces' },
  { id: 'log-7', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 49 * 60 * 1000).toISOString(), status: 'present' },
  { id: 'log-8', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'no_face' },
  { id: 'log-9', testId: 'test-2', candidateId: 'cand-3', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), status: 'present' },
];
