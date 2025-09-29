
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTestsStore, useSubmissionsStore, useCandidatesStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, FileWarning, Loader2, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { isFirebaseEnabled } from '@/lib/firebase';
import type { Test, Candidate, Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubmissionsPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.testId as string;

    const { tests } = useTestsStore();
    const { candidates } = useCandidatesStore();
    const { submissions } = useSubmissionsStore();

    const [test, setTest] = useState<Test | null>(null);
    const [testSubmissions, setTestSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTest(tests.find(t => t.id === testId) || null);
        setTestSubmissions(submissions.filter(s => s.testId === testId));

        if (tests.length > 0 || !isFirebaseEnabled) {
            setLoading(false);
        }
    }, [testId, tests, submissions]);


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary"><CheckCircle className='mr-1 h-3 w-3'/>Completed</Badge>
            case 'evaluating': return <Badge variant="outline" className="text-accent-foreground border-accent"><Clock className='mr-1 h-3 w-3'/>Evaluating</Badge>
            default: return <Badge><FileWarning className='mr-1 h-3 w-3'/>{status}</Badge>
        }
    }

    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className='h-10 w-32' />
                <Card>
                    <CardHeader>
                        <Skeleton className='h-8 w-1/2' />
                        <Skeleton className='h-4 w-3/4' />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className='h-48 w-full' />
                    </CardContent>
                </Card>
             </div>
        )
    }

    if (!test) {
        return <div>Test not found</div>;
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.push('/dashboard/tests')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
            </Button>
             <Card>
                <CardHeader>
                    <CardTitle>Submissions for "{test.title}"</CardTitle>
                    <CardDescription>Review the submissions from candidates for this test.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className='text-right'>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 2}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-9 w-9 rounded-full" />
                                                <div>
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-3 w-32 mt-1" />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        <TableCell className='text-right'><Skeleton className="h-8 w-28" /></TableCell>
                                    </TableRow>
                                ))
                            ) : testSubmissions.length > 0 ? testSubmissions.map(submission => {
                                const candidate = candidates.find(c => c.id === submission.candidateId);
                                return (
                                    <TableRow key={submission.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{candidate?.name}</p>
                                                    <p className="text-sm text-muted-foreground">{candidate?.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}</TableCell>
                                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                                        <TableCell className='text-right'>
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/evaluator/submission/${submission.id}`)}>
                                                View Evaluation
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No submissions for this test yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
