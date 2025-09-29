

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTestsStore, useSubmissionsStore, useCandidatesStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { isFirebaseEnabled } from '@/lib/firebase';
import type { Test, Candidate, Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EvaluatorDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { tests } = useTestsStore();
    const { candidates } = useCandidatesStore();
    const { submissions, deleteSubmission } = useSubmissionsStore();
    
    const [loading, setLoading] = useState(true);
    const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
    
    // Filtering state
    const [statusFilter, setStatusFilter] = useState('all');
    const [testFilter, setTestFilter] = useState('all');

    useEffect(() => {
        if ((tests.length > 0 && candidates.length > 0) || !isFirebaseEnabled) {
            setLoading(false);
        }
    }, [tests, candidates]);

    const handleDeleteSubmissions = async (submissionIds: string[]) => {
        const plural = submissionIds.length > 1;
        try {
            await Promise.all(submissionIds.map(id => deleteSubmission(id)));
            toast({ title: `Submission${plural ? 's' : ''} Deleted`, description: `The selected submission${plural ? 's have' : ' has'} been removed.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete submission${plural ? 's' : ''}.` });
        } finally {
            setSubmissionToDelete(null);
            setSelectedSubmissions([]);
            setShowBulkDeleteConfirm(false);
        }
    }

    const filteredSubmissions = submissions.filter(submission => {
        const statusMatch = statusFilter === 'all' || submission.status === statusFilter;
        const testMatch = testFilter === 'all' || submission.testId === testFilter;
        return statusMatch && testMatch;
    });
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSubmissions(filteredSubmissions.map(s => s.id));
        } else {
            setSelectedSubmissions([]);
        }
    };
    
    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedSubmissions(prev => [...prev, id]);
        } else {
            setSelectedSubmissions(prev => prev.filter(subId => subId !== id));
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary"><CheckCircle className='mr-1 h-3 w-3'/>Completed</Badge>
            case 'evaluating': return <Badge variant="outline" className="text-accent-foreground border-accent"><Clock className='mr-1 h-3 w-3'/>Pending</Badge>
            default: return <Badge>{status}</Badge>
        }
    }
    
    const getResultBadge = (result?: 'pass' | 'fail') => {
        if (result === 'pass') {
            return <Badge variant="secondary" className="bg-green-500/20 text-green-700 hover:bg-green-500/30"><CheckCircle className='mr-1 h-3 w-3'/>Pass</Badge>
        }
        if (result === 'fail') {
            return <Badge variant="destructive"><XCircle className='mr-1 h-3 w-3'/>Fail</Badge>
        }
        return <span className="text-muted-foreground">-</span>;
    }


    return (
        <div className="space-y-6">
            <AlertDialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the submission.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSubmissions([submissionToDelete!.id])} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will permanently delete the {selectedSubmissions.length} selected submission(s). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSubmissions(selectedSubmissions)} className='bg-destructive hover:bg-destructive/90'>Delete Selected</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                         <CardHeader>
                            <CardTitle>Filter Submissions</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by status..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="evaluating">Pending</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>Test</label>
                                <Select value={testFilter} onValueChange={setTestFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by test..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tests</SelectItem>
                                        {tests.map(test => (
                                            <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedSubmissions.length > 0 && (
                                <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)} className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedSubmissions.length})
                                </Button>
                            )}
                         </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submissions for Evaluation</CardTitle>
                            <CardDescription>Review the submissions from candidates.</CardDescription>
                        </CardHeader>
                        <CardContent className='pt-0'>
                            <div className="relative w-full overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='px-4'>
                                                <Checkbox
                                                    checked={filteredSubmissions.length > 0 && selectedSubmissions.length === filteredSubmissions.length}
                                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                    aria-label="Select all"
                                                />
                                            </TableHead>
                                            <TableHead>Candidate</TableHead>
                                            <TableHead>Test</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Result</TableHead>
                                            <TableHead className='text-right'>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({length: 3}).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className='px-4'><Checkbox disabled /></TableCell>
                                                    <TableCell>
                                                        <Skeleton className="h-4 w-24 mb-1" />
                                                        <Skeleton className="h-3 w-32" />
                                                    </TableCell>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                                    <TableCell className='text-right'><Skeleton className="h-8 w-24" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : filteredSubmissions.length > 0 ? filteredSubmissions.map(submission => {
                                            const candidate = candidates.find(c => c.id === submission.candidateId);
                                            const test = tests.find(t => t.id === submission.testId);
                                            const isSelected = selectedSubmissions.includes(submission.id);
                                            const totalMarks = test?.questions.reduce((acc, q) => acc + (q.marks || 0), 0) || 0;
                                            return (
                                                <TableRow key={submission.id} data-state={isSelected && "selected"}>
                                                    <TableCell className='px-4'>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => handleSelectRow(submission.id, !!checked)}
                                                            aria-label="Select row"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{candidate?.name}</p>
                                                            <p className="text-sm text-muted-foreground">{candidate?.email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{test?.title}</TableCell>
                                                    <TableCell>{formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}</TableCell>
                                                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                                                    <TableCell>
                                                        {submission.score !== null && submission.score !== undefined ? (
                                                            <span className='font-medium'>{submission.score} / {totalMarks}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{getResultBadge(submission.result)}</TableCell>
                                                    <TableCell className='text-right'>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => router.push(`/evaluator/submission/${submission.id}`)}
                                                            >
                                                                {submission.status === 'completed' ? 'View' : 'Evaluate'}
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => setSubmissionToDelete(submission)} className="text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center h-24">
                                                    No submissions match your filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
