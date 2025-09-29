
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, LogIn, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useTestsStore, useCandidatesStore, useSubmissionsStore } from '@/lib/store';
import Link from 'next/link';
import type { Test } from '@/lib/types';

export default function AccessTestPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [accessCode, setAccessCode] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Local data for fallback
    const { tests: localTests } = useTestsStore();
    const { candidates: localCandidates } = useCandidatesStore();
    const { submissions, fetchAllSubmissions } = useSubmissionsStore();

    useEffect(() => {
        // Fetch all submissions on mount to check for duplicates
        fetchAllSubmissions();
    }, [fetchAllSubmissions]);

    const handleStartTest = async () => {
        if (!email || !accessCode) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please provide both your email and the access code.'
            });
            return;
        }

        setLoading(true);

        try {
            let test: Test | null = null;
            let candidateId: string | null = null;

            if (isFirebaseEnabled) {
                // 1. Find test by access code in Firestore
                const testsRef = collection(db, "tests");
                const testQuery = query(testsRef, where("accessCode", "==", accessCode.toUpperCase()));
                const testSnapshot = await getDocs(testQuery);

                if (!testSnapshot.empty) {
                    const testDoc = testSnapshot.docs[0];
                    test = { id: testDoc.id, ...testDoc.data() } as Test;
                }

                // 2. Find candidate by email in Firestore
                const candidatesRef = collection(db, "candidates");
                const candidateQuery = query(candidatesRef, where("email", "==", email.toLowerCase()), limit(1));
                const candidateSnapshot = await getDocs(candidateQuery);
                
                if (!candidateSnapshot.empty) {
                    const candidateDoc = candidateSnapshot.docs[0];
                    candidateId = candidateDoc.id;
                }
            } else {
                // Fallback to local data if Firebase is disabled
                const localTest = localTests.find(t => t.accessCode?.toUpperCase() === accessCode.toUpperCase());
                const localCandidate = localCandidates.find(c => c.email.toLowerCase() === email.toLowerCase());

                if (localTest) {
                    test = localTest;
                }
                if (localCandidate) {
                    candidateId = localCandidate.id;
                }
            }
            
            // 3. Validations
            if (!test || !candidateId) {
                 toast({
                    variant: 'destructive',
                    title: 'Access Denied',
                    description: 'Invalid email or access code. Please make sure you are registered.'
                });
                setLoading(false);
                return;
            }
            
            // 4. Check if candidate is assigned to the test
            if (!test.assignedCandidateIds?.includes(candidateId)) {
                toast({
                    variant: 'destructive',
                    title: 'Access Denied',
                    description: 'You have not been assigned to take this test.'
                });
                setLoading(false);
                return;
            }

            // 5. Check for existing submission
            const existingSubmission = submissions.find(
                s => s.testId === test!.id && s.candidateId === candidateId
            );
            if (existingSubmission) {
                toast({
                    variant: 'destructive',
                    title: 'Access Code Expired',
                    description: 'You have already submitted this test. Access codes are for single use.'
                });
                setLoading(false);
                return;
            }

            // 6. Redirect to test
            router.push(`/test/${candidateId}/${test.id}`);

        } catch (error: any) {
            console.error('Error starting test:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred while trying to start the test.'
            });
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className='text-center'>
                <CardTitle>Take a Test</CardTitle>
                <CardDescription>Enter your email and the provided access code to begin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g., john.doe@example.com"
                        className="pl-9"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="access-code">Access Code</Label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                        id="access-code"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Enter your code"
                        className="pl-9 text-center tracking-widest"
                        />
                    </div>
                </div>
                <Button onClick={handleStartTest} className="w-full" disabled={loading || !email || !accessCode}>
                    <LogIn className="mr-2" />
                    {loading ? 'Verifying...' : 'Start Test'}
                </Button>
                <p className="text-center text-sm text-muted-foreground pt-2">
                    Not registered yet? <Link href="/login" className='font-medium text-primary hover:underline'>Register here</Link>.
                </p>
            </CardContent>
        </Card>
    );
}
