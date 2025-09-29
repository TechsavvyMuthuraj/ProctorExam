'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubmissionsStore } from '@/lib/store';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { CheckCircle, XCircle } from 'lucide-react';

function TestCompletedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const { submissions: localSubmissions } = useSubmissionsStore();
  const [submissionResult, setSubmissionResult] = useState<Submission['result'] | undefined>(undefined);

  useEffect(() => {
    async function fetchSubmission() {
      if (!submissionId) return;

      let submission: Submission | undefined;

      if (isFirebaseEnabled) {
        const submissionRef = doc(db, 'submissions', submissionId);
        const submissionSnap = await getDoc(submissionRef);
        if (submissionSnap.exists()) {
          submission = submissionSnap.data() as Submission;
        }
      } else {
        submission = localSubmissions.find(s => s.id === submissionId);
      }

      if (submission?.result) {
        setSubmissionResult(submission.result);
      }
    }

    fetchSubmission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 8000);

    return () => clearTimeout(timer);
  }, [router]);

  const getResultContent = () => {
    if (submissionResult === 'pass') {
      return {
        icon: <CheckCircle className="h-24 w-24 text-green-500" />,
        title: 'Assessment Passed!',
        message: 'Congratulations! You have successfully passed the assessment. Your submission has been received.',
      };
    }
    if (submissionResult === 'fail') {
      return {
        icon: <XCircle className="h-24 w-24 text-destructive" />,
        title: 'Assessment Not Passed',
        message: 'Thank you for your time. Your submission has been received. We will review your results.',
      };
    }
    return {
      icon: null,
      title: 'Assessment Completed!',
      message: 'Thank you for your time. Your submission has been received. You will be redirected shortly.',
    };
  };

  const { icon, title, message } = getResultContent();

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center p-4 space-y-6 animate-in fade-in-50 duration-1000">
        {icon && <div className="flex justify-center">{icon}</div>}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function TestCompletedPage() {
    return (
        <Suspense fallback={<div>Loading result...</div>}>
            <TestCompletedContent />
        </Suspense>
    )
}
