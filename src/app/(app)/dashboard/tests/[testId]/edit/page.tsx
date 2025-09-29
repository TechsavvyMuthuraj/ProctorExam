

'use client';

import { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Test, TestCategory } from '@/lib/types';
import { useTestsStore } from '@/lib/store';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditTestPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { tests, updateTest } = useTestsStore();
    const [isPending, startTransition] = useTransition();

    const testId = params.testId as string;
    
    const [test, setTest] = useState<Partial<Test> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if(!testId) return;

        setLoading(true);

        const testToEdit = tests.find(t => t.id === testId);
        if (testToEdit) {
            setTest(testToEdit);
        } else if (tests.length > 0) { // Only show error if tests have loaded but not found
            toast({ variant: 'destructive', title: 'Test not found' });
            router.back();
        }
        
        if (tests.length > 0) {
            setLoading(false);
        }
    }, [testId, router, toast, tests]);

    const handleTestChange = (field: keyof Test, value: any) => {
        if ((field === 'timeLimit') && value === '') {
            setTest(prev => prev ? { ...prev, [field]: '' } : null);
        } else {
            setTest(prev => prev ? { ...prev, [field]: value } : null);
        }
    };

    const saveTest = () => {
        if (!test) return;

        const testToSave = {
            ...test,
            timeLimit: Number(test.timeLimit) || 60,
        };

        startTransition(async () => {
            await updateTest(testToSave as Test);
            toast({
                title: 'Test Updated!',
                description: 'The test details have been successfully updated.',
            });
            router.push('/dashboard/tests');
        });
    };

    if (loading || !test) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const totalMarks = test.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Test</CardTitle>
                    <CardDescription>Modify the details of your test below. Note: Questions cannot be edited from this screen. Total marks for this test: {totalMarks}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Test Title</Label>
                        <Input id="title" value={test.title || ''} onChange={(e) => handleTestChange('title', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={test.description || ''} onChange={(e) => handleTestChange('description', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                            <Input id="timeLimit" type="number" value={test.timeLimit} onChange={(e) => handleTestChange('timeLimit', e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Test Category</Label>
                            <Select value={test.category} onValueChange={(val: TestCategory) => handleTestChange('category', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Technical">Technical</SelectItem>
                                    <SelectItem value="Aptitude">Aptitude</SelectItem>
                                    <SelectItem value="Logical">Logical</SelectItem>
                                    <SelectItem value="Verbal">Verbal</SelectItem>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Java">Java</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={saveTest} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    
