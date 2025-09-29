
'use client';
import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, FileText, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSubmissionsStore, useTestsStore, useCandidatesStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { ProctoringLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  
  // Zustand stores are now populated by DashboardLayout
  const { submissions } = useSubmissionsStore();
  const { tests } = useTestsStore();
  const { candidates } = useCandidatesStore();

  const [proctoringLogs, setProctoringLogs] = useState<ProctoringLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Data comes from the global store, so we just check if it's loaded.
     if (tests.length > 0 || !isFirebaseEnabled) {
      setLoading(false);
    }
    
    // In a real app, proctoring logs would also be fetched, likely with pagination.
    // For this prototype, we will fetch them on-demand or use local data.
    if (isFirebaseEnabled) {
        const proctoringQuery = query(collection(db, 'proctoringLogs'));
        const unsubscribe = onSnapshot(proctoringQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProctoringLog));
            setProctoringLogs(logs);
        });
        return () => unsubscribe();
    } else {
        const { proctoringLogs: localLogs } = require('@/lib/data');
        setProctoringLogs(localLogs);
    }
  }, [tests.length]);

  const submissionsToReview = submissions.filter(s => s.status === 'evaluating');
  const flaggedEventsCount = proctoringLogs.filter(
    log => log.status === 'no_face' || log.status === 'multiple_faces' || log.status === 'tab_switch'
  ).length;
  
  const recentSubmissions = submissions
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  const recentTests = tests
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className='cursor-pointer hover:bg-muted' onClick={() => router.push('/dashboard/tests')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{tests.length}</div>}
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        <Card className='cursor-pointer hover:bg-muted' onClick={() => router.push('/dashboard/candidates')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{candidates.length}</div>}
            <p className="text-xs text-muted-foreground">
              +10% from last month
            </p>
          </CardContent>
        </Card>
        <Card className='cursor-pointer hover:bg-muted' onClick={() => router.push('/evaluator')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions to Review</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{submissionsToReview.length}</div>}
            <p className="text-xs text-muted-foreground">
              Waiting for evaluation
            </p>
          </CardContent>
        </Card>
        <Card className="border-accent cursor-pointer hover:bg-muted" onClick={() => router.push('/dashboard/analysis')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Events</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-accent">{flaggedEventsCount}</div>}
            <p className="text-xs text-muted-foreground">
              In last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>
              Candidates who have recently completed their tests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="space-y-6">
                    {Array.from({length: 4}).map((_, i) => (
                         <div key={i} className="flex items-center">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="ml-4 space-y-2">
                               <Skeleton className="h-4 w-24" />
                               <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                {recentSubmissions.map(submission => {
                    const candidate = candidates.find(
                    c => c.id === submission.candidateId
                    );
                    const test = tests.find(t => t.id === submission.testId);
                    return (
                    <div key={submission.id} className="flex items-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {candidate?.name || 'Unknown Candidate'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {test?.title || 'Unknown Test'}
                        </p>
                        </div>
                        <div className="ml-auto font-medium">
                        {submission.status === 'completed' ? (
                            <Badge variant="secondary">Completed</Badge>
                        ) : (
                            <Badge variant="outline" className="text-accent-foreground border-accent">Evaluating</Badge>
                        )}
                        </div>
                    </div>
                    );
                })}
                 {recentSubmissions.length === 0 && <p className='text-center text-sm text-muted-foreground py-8'>No recent submissions.</p>}
                </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
            <CardDescription>A list of recently created tests.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
                 <div className='p-2'>
                    {Array.from({length: 4}).map((_, i) => (
                        <div key={i} className='flex justify-between py-3'>
                            <div className='space-y-2'>
                                <Skeleton className='h-4 w-40' />
                                <Skeleton className='h-3 w-24' />
                            </div>
                             <Skeleton className='h-4 w-20' />
                        </div>
                    ))}
                 </div>
             ) : (
                <div className="relative w-full overflow-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Test Title</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentTests.map(test => (
                        <TableRow key={test.id} className='cursor-pointer' onClick={() => router.push(`/dashboard/tests/${test.id}`)}>
                            <TableCell>
                            <div className="font-medium">{test.title}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                                {(test.assignedCandidateIds || []).length} candidates assigned
                            </div>
                            </TableCell>
                            <TableCell className="text-right">
                            {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
                            </TableCell>
                        </TableRow>
                        ))}
                        {recentTests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No recent tests found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
