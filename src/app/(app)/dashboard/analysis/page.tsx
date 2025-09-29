
'use client';

import { useState, useEffect } from 'react';
import { ProctoringAnalysis } from '@/components/analysis/proctoring-analysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Candidate, Test, Submission, ProctoringLog } from '@/lib/types';
import { useSubmissionsStore, useTestsStore, useCandidatesStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalysisPage() {
    const { tests } = useTestsStore();
    const { candidates } = useCandidatesStore();
    const { submissions } = useSubmissionsStore();

    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [proctoringLogs, setProctoringLogs] = useState<ProctoringLog[]>([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isFirebaseEnabled) {
            if (tests.length > 1) {
                setSelectedTestId(tests[1]?.id || null);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFirebaseEnabled, tests]);

    useEffect(() => {
        const submission = submissions.find(s => s.testId === selectedTestId && s.candidateId === selectedCandidateId);
        setSelectedSubmission(submission || null);

        let logsUnsubscribe: (() => void) | null = null;
        if (submission) {
             if (isFirebaseEnabled) {
                setLoading(true);
                const logsQuery = query(collection(db, 'proctoringLogs'), 
                    where('candidateId', '==', submission.candidateId), 
                    where('testId', '==', submission.testId)
                );
                logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {
                    const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProctoringLog));
                    setProctoringLogs(logsData);
                    setLoading(false);
                });
            } else {
                const { proctoringLogs: localProctoringLogs } = require('@/lib/data');
                const logs = localProctoringLogs.filter((l: ProctoringLog) => l.candidateId === submission.candidateId && l.testId === submission.testId);
                setProctoringLogs(logs);
                setLoading(false);
            }
        } else {
            setProctoringLogs([]);
        }
        
        return () => {
            if (logsUnsubscribe) {
                logsUnsubscribe();
            }
        }
    }, [selectedTestId, selectedCandidateId, submissions]);
    
    const candidatesForSelectedTest = candidates.filter(c => 
        submissions.some(s => s.testId === selectedTestId && s.candidateId === c.id)
    );

    const testToAnalyze = selectedTestId ? tests.find(t => t.id === selectedTestId) : null;
    const candidateToAnalyze = selectedCandidateId ? candidates.find(c => c.id === selectedCandidateId) : null;

  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Select a Session to Analyze</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium mb-2 block">Test</label>
                    <Select onValueChange={(value) => { setSelectedTestId(value); setSelectedCandidateId(null); }} value={selectedTestId || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a test..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tests.length === 0 ? <SelectItem value="loading" disabled>Loading...</SelectItem> : tests.map(test => (
                                <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div>
                     <label className="text-sm font-medium mb-2 block">Candidate</label>
                    <Select onValueChange={setSelectedCandidateId} value={selectedCandidateId || ""} disabled={!selectedTestId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a candidate..." />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedTestId && candidatesForSelectedTest.length > 0 ? (
                                candidatesForSelectedTest.map(candidate => (
                                    <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No submissions for this test</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                 </div>
            </CardContent>
        </Card>

      {loading && selectedTestId && (
        <Card>
          <CardContent className='pt-6'>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      )}

      {!loading && testToAnalyze && candidateToAnalyze && selectedSubmission ? (
        <ProctoringAnalysis 
          candidate={candidateToAnalyze}
          test={testToAnalyze}
          logs={proctoringLogs}
        />
      ) : !loading && selectedTestId ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Please select a candidate to view the analysis.</p>
        </div>
      ) : !loading ? (
         <div className="text-center py-12 text-muted-foreground">
          <p>Please select a test to begin.</p>
        </div>
      ) : null}
    </div>
  );
}
