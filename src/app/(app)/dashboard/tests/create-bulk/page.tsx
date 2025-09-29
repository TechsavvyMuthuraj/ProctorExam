
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Bot, FileText, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Question, Test, TestCategory } from '@/lib/types';
import { useTestsStore } from '@/lib/store';
import { processBulkQuestions } from '@/lib/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateTestBulkPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { addTest } = useTestsStore();
    const [isProcessing, startProcessing] = useTransition();
    const [isCreating, startCreating] = useTransition();
    
    // Test Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(60);
    const [category, setCategory] = useState<TestCategory>('Technical');
    const [evaluationMode, setEvaluationMode] = useState<'automatic' | 'manual'>('automatic');

    // AI Processing
    const [rawText, setRawText] = useState('');
    const [processedQuestions, setProcessedQuestions] = useState<Partial<Question>[]>([]);

    const handleProcessQuestions = () => {
        if (!rawText.trim()) {
            toast({ variant: 'destructive', title: 'No text provided', description: 'Please paste the questions into the text area.' });
            return;
        }
        startProcessing(async () => {
            const result = await processBulkQuestions(rawText);
            if (result.error) {
                toast({ variant: 'destructive', title: 'AI Parsing Failed', description: result.error });
            } else if (result.data) {
                if (result.data.questions.length === 0) {
                    toast({ variant: 'destructive', title: 'Parsing Failed', description: 'Found 0 questions. Please check the format of your text and try again.'});
                } else {
                    toast({ title: 'Parsing Successful!', description: `Found ${result.data.questions.length} questions.`});
                }
                setProcessedQuestions(result.data.questions.map(q => ({...q, type: 'mcq'})));
            }
        });
    }

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...processedQuestions];
        const question = { ...newQuestions[index], [field]: value };
        newQuestions[index] = question;
        setProcessedQuestions(newQuestions);
    };
    
    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...processedQuestions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options![oIndex] = value;
            setProcessedQuestions(newQuestions);
        }
    };

    const removeQuestion = (index: number) => {
        const newQuestions = processedQuestions.filter((_, i) => i !== index);
        setProcessedQuestions(newQuestions);
    };
    

    const saveTest = () => {
        if (!title || processedQuestions.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a title and generate at least one question.'});
            return;
        }

        startCreating(async () => {
            const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const testId = `test-${Date.now()}`;
            const newTest: Test = {
                id: testId,
                title,
                description,
                category,
                timeLimit,
                createdBy: 'user-1',
                createdAt: new Date().toISOString(),
                assignedCandidateIds: [],
                accessCode,
                passingScore: 70, 
                evaluationMode,
                questions: processedQuestions.map((q, i) => ({
                    ...q,
                    id: `q-${Date.now()}-${i}`,
                    testId: testId,
                })) as Question[],
            };
            await addTest(newTest);
            toast({
                title: 'Test Created!',
                description: `The test "${title}" with ${processedQuestions.length} questions has been saved.`,
            });
            router.push('/dashboard/tests');
        });
    };

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
            </Button>
            
            <Card>
                <CardHeader>
                    <CardTitle>Create Test from Text</CardTitle>
                    <CardDescription>
                        Paste a block of text containing multiple-choice questions. The AI will automatically parse them into the correct format, even if the formatting is messy.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="raw-text">Questions Text</Label>
                        <Textarea 
                            id="raw-text" 
                            rows={15} 
                            value={rawText} 
                            onChange={(e) => setRawText(e.target.value)} 
                            placeholder="Paste your questions here. For example:&#10;1. What is the capital of France?&#10;a) London&#10;b) Paris&#10;c) Berlin&#10;Answer: B&#10;&#10;Q2. Which planet is known as the Red Planet?&#10;a) Earth&#10;b) Mars&#10;c) Jupiter&#10;The correct answer is Mars."
                        />
                    </div>
                     <Button onClick={handleProcessQuestions} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Parse Questions with AI
                    </Button>
                </CardContent>
            </Card>

            {isProcessing && (
                 <Card>
                    <CardContent className='pt-6 flex flex-col items-center justify-center h-64 gap-4'>
                        <Bot className='h-12 w-12 text-primary animate-pulse' />
                        <p className='text-lg font-medium'>AI is parsing your questions...</p>
                        <p className='text-muted-foreground text-center'>This may take a moment. The AI is identifying the questions, options, and answers.</p>
                    </CardContent>
                </Card>
            )}

            {processedQuestions.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Review and Create Test</CardTitle>
                        <CardDescription>Review the parsed questions and fill in the test details below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="title">Test Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Java Fundamentals Quiz" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                                <Input id="timeLimit" type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the test." />
                        </div>
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Test Category</Label>
                                <Select value={category} onValueChange={(val: TestCategory) => setCategory(val)}>
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
                            <div className="space-y-2">
                                <Label>Evaluation Mode</Label>
                                <Select value={evaluationMode} onValueChange={(val: 'automatic' | 'manual') => setEvaluationMode(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select evaluation mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="automatic">Automatic (MCQ only)</SelectItem>
                                        <SelectItem value="manual">Manual Evaluation</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Since this is a bulk MCQ import, 'Automatic' is recommended.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Parsed Questions ({processedQuestions.length})</h3>
                            <ScrollArea className='h-[500px] w-full p-4 border rounded-md'>
                                {processedQuestions.map((q, qIndex) => (
                                    <Card key={qIndex} className="p-4 space-y-4 mb-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-sm flex-1 pr-4">Question {qIndex + 1}</h4>
                                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Question Text</Label>
                                            <Textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Options</Label>
                                            {q.options?.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2">
                                                    <Input value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className='grid grid-cols-2 gap-4'>
                                            <div className="space-y-2">
                                                <Label>Correct Answer</Label>
                                                <Input value={q.answer as string || ''} onChange={e => handleQuestionChange(qIndex, 'answer', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Marks</Label>
                                                <Input type="number" value={q.marks ?? ''} onChange={e => handleQuestionChange(qIndex, 'marks', parseInt(e.target.value, 10))}/>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </ScrollArea>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button onClick={saveTest} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Test
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
