

'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTestsStore, useCandidatesStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User } from 'lucide-react';
import type { Candidate, Test } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default function AssignCandidatesPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { tests, assignCandidates } = useTestsStore();
    const { candidates } = useCandidatesStore();
    
    const testId = params.testId as string;
    
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

    useEffect(() => {
        const currentTest = tests.find(t => t.id === testId) || null;
        setTest(currentTest);
        if (tests.length > 0 && candidates.length > 0) {
            setLoading(false);
        }
    }, [testId, tests, candidates]);


    const handleSelectCandidate = (candidateId: string) => {
        setSelectedCandidates(prev => 
            prev.includes(candidateId) 
                ? prev.filter(id => id !== candidateId)
                : [...prev, candidateId]
        );
    };

    const handleAssign = async () => {
        if (selectedCandidates.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No candidates selected',
                description: 'Please select at least one candidate to assign the test.'
            });
            return;
        }

        await assignCandidates(testId, selectedCandidates);

        toast({
            title: 'Candidates Assigned',
            description: `Successfully assigned the test to ${selectedCandidates.length} new candidate(s).`
        });
        router.push(`/dashboard/tests/${testId}`);
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-24" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className='space-y-4 pt-6'>
                        {Array.from({length: 3}).map((_, i) => (
                             <div key={i} className="flex items-center space-x-4 p-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className='flex-1 space-y-2'>
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!test) {
        return <div>Test not found</div>;
    }
    
    const alreadyAssigned = test?.assignedCandidateIds || [];
    const availableCandidates = candidates.filter(c => !alreadyAssigned.includes(c.id));


    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Test
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Assign Candidates to "{test.title}"</CardTitle>
                    <CardDescription>Select candidates from the list below to assign them this test. New candidates will appear here automatically.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                           <div className='space-y-4 pt-6'>
                             {Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className='flex-1 space-y-2'>
                                        <Skeleton className="h-4 w-1/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                           </div>
                        ) : availableCandidates.length > 0 ? availableCandidates.map(candidate => (
                            <div key={candidate.id} className="flex items-center space-x-4 p-2 rounded-md hover:bg-muted">
                                <Checkbox
                                    id={candidate.id}
                                    checked={selectedCandidates.includes(candidate.id)}
                                    onCheckedChange={() => handleSelectCandidate(candidate.id)}
                                />
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className='flex-1'>
                                    <Label htmlFor={candidate.id} className="font-medium cursor-pointer">{candidate.name}</Label>
                                    <p className='text-sm text-muted-foreground'>{candidate.email}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">All candidates have already been assigned this test.</p>
                        )}
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button onClick={handleAssign} disabled={selectedCandidates.length === 0}>
                            Assign Selected ({selectedCandidates.length})
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
