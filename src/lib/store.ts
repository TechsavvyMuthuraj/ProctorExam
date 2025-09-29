

'use client';

import { create } from 'zustand';
import type { Test, Submission, Question, Candidate, ProctoringLog } from './types';
import { tests as initialTests, submissions as initialSubmissions, candidates as initialCandidates } from './data';
import { isFirebaseEnabled, db } from './firebase';
import { doc, updateDoc, arrayUnion, writeBatch, collection, deleteDoc, getDocs, setDoc } from 'firebase/firestore';


type TestsState = {
  tests: Test[];
  setTests: (tests: Test[]) => void;
  addTest: (test: Test) => Promise<void>;
  updateTest: (test: Partial<Test>) => Promise<void>;
  deleteTest: (testId: string) => void;
  deleteQuestion: (questionId: string, testId: string) => void;
  assignCandidates: (testId: string, candidateIds: string[]) => Promise<void>;
  updateQuestion: (updatedQuestion: Partial<Question> & { id: string; testId: string }) => void;
};

export const useTestsStore = create<TestsState>((set, get) => ({
  tests: initialTests,
  setTests: (tests) => set({ tests }),
  addTest: async (test) => {
    if (isFirebaseEnabled) {
      try {
        const batch = writeBatch(db);
        const testRef = doc(db, 'tests', test.id);
        const { questions, ...testData } = test;
        
        batch.set(testRef, {
            ...testData,
            assignedCandidateIds: testData.assignedCandidateIds || [] 
        });

        test.questions.forEach(question => {
          const questionRef = doc(collection(testRef, 'questions'), question.id);
          batch.set(questionRef, { ...question, testId: test.id });
        });

        await batch.commit();
      } catch (error) {
        console.error("Error adding test to Firestore:", error);
      }
    } else {
        set((state) => ({ tests: [...state.tests, test] }));
    }
  },
  updateTest: async (test) => {
    if (isFirebaseEnabled && test.id) {
        try {
            const testRef = doc(db, 'tests', test.id);
            const { questions, ...testData } = test;
            await updateDoc(testRef, testData as any);
        } catch (error) {
            console.error("Error updating test in Firestore:", error);
        }
    }
    set(state => ({
        tests: state.tests.map(t => t.id === test.id ? { ...t, ...test } as Test : t)
    }));
  },
  deleteTest: async (testId) => {
    if (isFirebaseEnabled) {
      try {
        const questionsRef = collection(db, 'tests', testId, 'questions');
        const questionsSnap = await getDocs(questionsRef);
        const batch = writeBatch(db);
        questionsSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        await deleteDoc(doc(db, 'tests', testId));
      } catch (error) {
        console.error("Error deleting test from Firestore:", error);
      }
    } else {
       set((state) => ({ tests: state.tests.filter(test => test.id !== testId) }));
    }
  },
  deleteQuestion: async (questionId, testId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, 'tests', testId, 'questions', questionId));
      } catch (error) {
        console.error("Error deleting question from Firestore:", error);
      }
    } else {
        set((state) => ({
        tests: state.tests.map(test => {
            if(test.id !== testId) return test;
            return {
                ...test,
                questions: test.questions.filter(q => q.id !== questionId),
            }
        })
        }));
    }
  },
  assignCandidates: async (testId, candidateIds) => {
    if (isFirebaseEnabled) {
        try {
            const testRef = doc(db, 'tests', testId);
            await updateDoc(testRef, {
                assignedCandidateIds: arrayUnion(...candidateIds)
            });
        } catch (error) {
            console.error("Error assigning candidates in Firestore:", error);
        }
    } else {
        set((state) => ({
            tests: state.tests.map(test => 
            test.id === testId 
                ? { ...test, assignedCandidateIds: Array.from(new Set([...(test.assignedCandidateIds || []), ...candidateIds])) }
                : test
            )
        }));
    }
  },
  updateQuestion: async (updatedQuestion) => {
    if (isFirebaseEnabled) {
        try {
            const questionRef = doc(db, 'tests', updatedQuestion.testId, 'questions', updatedQuestion.id);
            await updateDoc(questionRef, updatedQuestion as any);
        } catch(error) {
             console.error("Error updating question in Firestore:", error);
        }
    }
    else {
        set((state) => ({
        tests: state.tests.map(test => {
            if (test.id !== updatedQuestion.testId) return test;
            return {
                ...test,
                questions: test.questions.map(q => q.id === updatedQuestion.id ? {...q, ...updatedQuestion} : q),
            }
        })
        }));
    }
  },
}));


type SubmissionsState = {
    submissions: Submission[];
    setSubmissions: (submissions: Submission[]) => void;
    fetchAllSubmissions: () => Promise<void>;
    addSubmission: (submission: Omit<Submission, 'result'>, proctoringLogs: Omit<ProctoringLog, 'id'>[], test: Test, timeTaken: number) => Promise<void>;
    updateSubmission: (submissionId: string, data: Partial<Submission>) => void;
    deleteSubmission: (submissionId: string) => Promise<void>;
}

export const useSubmissionsStore = create<SubmissionsState>((set, get) => ({
    submissions: initialSubmissions,
    setSubmissions: (submissions) => set({ submissions }),
    fetchAllSubmissions: async () => {
        if (isFirebaseEnabled) {
            try {
                const querySnapshot = await getDocs(collection(db, "submissions"));
                const submissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
                set({ submissions });
            } catch (error) {
                console.error("Error fetching all submissions from Firestore:", error);
            }
        }
    },
    addSubmission: async (submission, proctoringLogs, test, timeTaken) => {
      let finalSubmission: Submission = { ...submission, timeTaken };

      const isAutoGradable = test.questions.every(q => q.type === 'mcq' || q.type === 'image-mcq' || q.type === 'video-mcq');
      if (test.evaluationMode === 'automatic' && isAutoGradable) {
          let score = 0;
          test.questions.forEach(q => {
              if ((q.type === 'mcq' || q.type === 'image-mcq' || q.type === 'video-mcq') && finalSubmission.answers[q.id] === q.answer) {
                  score += (q.marks || 0);
              }
          });
          
          finalSubmission.score = score;
          finalSubmission.status = 'completed';
          finalSubmission.result = score >= test.passingScore ? 'pass' : 'fail';
      }

      if (isFirebaseEnabled) {
        try {
          const batch = writeBatch(db);
          
          const submissionRef = doc(db, 'submissions', finalSubmission.id);
          batch.set(submissionRef, finalSubmission);
          
          proctoringLogs.forEach(log => {
              const logId = `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const logRef = doc(db, 'proctoringLogs', logId);
              batch.set(logRef, { ...log, id: logId });
          });

          await batch.commit();

        } catch (error) {
          console.error("Error adding submission and logs to Firestore:", error);
        }
      }
      set((state) => ({ submissions: [...state.submissions, finalSubmission] }))
    },
    updateSubmission: async (submissionId, data) => {
        if(isFirebaseEnabled) {
            try {
                await updateDoc(doc(db, 'submissions', submissionId), data);
            } catch (error) {
                console.error("Error updating submission in Firestore:", error);
            }
        }
        set((state) => ({
            submissions: state.submissions.map(s => 
                s.id === submissionId ? { ...s, ...data } : s
            )
        }))
    },
    deleteSubmission: async (submissionId) => {
        if (isFirebaseEnabled) {
            try {
                await deleteDoc(doc(db, 'submissions', submissionId));
            } catch (error) {
                console.error("Error deleting submission:", error);
            }
        }
        set(state => ({ submissions: state.submissions.filter(s => s.id !== submissionId) }));
    },
}));


type CandidatesState = {
  candidates: Candidate[];
  setCandidates: (candidates: Candidate[]) => void;
  addCandidate: (candidate: Candidate) => void;
  removeCandidate: (candidateId: string) => Promise<void>;
};

export const useCandidatesStore = create<CandidatesState>((set) => ({
  candidates: initialCandidates,
  setCandidates: (candidates) => set({ candidates }),
  addCandidate: (candidate) => {
    if (isFirebaseEnabled) {
        // This should be handled by auth/firestore triggers in a real app,
        // but for client-side, we add it directly if needed.
        // `signInAsCandidate` in login page handles the primary creation.
    } else {
        set((state) => ({ candidates: [...state.candidates, candidate] }));
    }
  },
  removeCandidate: async (candidateId) => {
    if (isFirebaseEnabled) {
      try {
        await deleteDoc(doc(db, "candidates", candidateId));
      } catch (error) {
        console.error("Error deleting candidate:", error);
      }
    } else {
       set((state) => ({ candidates: state.candidates.filter(c => c.id !== candidateId) }))
    }
  },
}));
