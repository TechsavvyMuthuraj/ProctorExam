
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, ArrowLeft, Image as ImageIcon, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Question, QuestionType, Test, CodeLanguage, QuestionCategory, TestCategory } from '@/lib/types';
import { useTestsStore } from '@/lib/store';
import { CodeBlock } from '@/components/ui/code-block';
import { Separator } from '@/components/ui/separator';

export default function CreateTestPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { addTest } = useTestsStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<TestCategory>('Technical');
    const [timeLimit, setTimeLimit] = useState<number | ''>(60);
    const [evaluationMode, setEvaluationMode] = useState<'manual' | 'automatic'>('manual');
    const [questions, setQuestions] = useState<Partial<Question>[]>([
        { type: 'mcq', category: 'general', questionText: '', options: ['', ''], answer: '', marks: 10 }
    ]);

    const addQuestion = () => {
        setQuestions([...questions, { type: 'mcq', category: 'general', questionText: '', options: ['', ''], answer: '', marks: 10 }]);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        let question = { ...newQuestions[index], [field]: value };

        const mcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];

        if (field === 'type') {
            if (!mcqTypes.includes(value as QuestionType)) {
                delete question.options;
                question.answer = '';
            } else if (mcqTypes.includes(value as QuestionType) && !question.options) {
                question.options = ['', ''];
                question.answer = '';
            }

            if (value === 'puzzle' && !question.language) {
                question.language = 'javascript';
            } else if (value !== 'puzzle') {
                delete question.language;
            }
        }
        
        if (field === 'marks') {
            question.marks = value === '' ? 0 : parseInt(value, 10);
        }

        newQuestions[index] = question;
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const oldOption = newQuestions[qIndex].options?.[oIndex];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options![oIndex] = value;
            if (newQuestions[qIndex].answer === oldOption) {
                newQuestions[qIndex].answer = '';
            }
            setQuestions(newQuestions);
        }
    };
    
    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options!.push('');
            setQuestions(newQuestions);
        }
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        const removedOption = newQuestions[qIndex].options?.[oIndex];
        if (newQuestions[qIndex].options && newQuestions[qIndex].options!.length > 2) {
            newQuestions[qIndex].options!.splice(oIndex, 1);
            if (newQuestions[qIndex].answer === removedOption) {
                newQuestions[qIndex].answer = '';
            }
            setQuestions(newQuestions);
        } else {
            toast({
                variant: 'destructive',
                title: 'Cannot remove option',
                description: 'This question type must have at least two options.'
            })
        }
    };

    const saveTest = () => {
        const mcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];
        for(const q of questions) {
            if (!q.questionText) {
                toast({ variant: 'destructive', title: 'Missing Question Text', description: 'Please ensure all questions have text.' });
                return;
            }
            if (q.type && mcqTypes.includes(q.type) && (!q.answer || !q.options?.includes(q.answer))) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Answer',
                    description: `Please select a valid correct answer for all multiple-choice questions.`
                });
                return;
            }
             if (!q.answer) {
                 toast({
                    variant: 'destructive',
                    title: 'Missing Correct Answer',
                    description: `Please provide a correct answer for all questions.`
                });
                return;
            }
        }

        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const testId = `test-${Date.now()}`;
        const newTest: Test = {
            id: testId,
            title,
            description,
            category,
            timeLimit: Number(timeLimit) || 60,
            createdBy: 'user-1',
            createdAt: new Date().toISOString(),
            assignedCandidateIds: [],
            accessCode,
            passingScore: 70,
            evaluationMode: evaluationMode,
            questions: questions.map((q, i) => ({
                ...q,
                id: `q-${Date.now()}-${i}`,
                testId: testId,
                marks: Number(q.marks) || 10,
            })) as Question[],
        };
        addTest(newTest);
        toast({
            title: 'Test Created!',
            description: `The access code is: ${accessCode}`,
        });
        router.push('/dashboard/tests');
    };

    const mcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    
    const questionCategories: QuestionCategory[] = ['logical', 'technical', 'verbal', 'aptitude', 'general'];
    const questionsBySection: Record<string, Partial<Question>[]> = questions.reduce((acc, q) => {
        const category = q.category || 'general';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(q);
        return acc;
    }, {} as Record<string, Partial<Question>[]>);
    
    const findQuestionIndex = (question: Partial<Question>) => {
        return questions.findIndex(q => q === question);
    }


    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Create New Test</CardTitle>
                    <CardDescription>Fill in the details below to create a new test. Total marks for this test: {totalMarks}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Test Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Frontend Developer Assessment" />
                        </div>
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
                            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                            <Input id="timeLimit" type="number" value={timeLimit === '' ? '' : timeLimit} onChange={(e) => setTimeLimit(e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of the test." />
                    </div>

                     <div className="space-y-2">
                        <Label>Evaluation Mode</Label>
                        <Select value={evaluationMode} onValueChange={(val: 'automatic' | 'manual') => setEvaluationMode(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select evaluation mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual Evaluation</SelectItem>
                                <SelectItem value="automatic">Automatic (MCQ only)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Automatic mode will instantly grade tests that contain only MCQs. Otherwise, it will require manual evaluation.
                        </p>
                    </div>

                    <Separator />
                    
                     <div className="space-y-8">
                        {questionCategories.map(cat => (
                            <div key={cat}>
                                <h3 className="text-lg font-medium capitalize mb-4">{cat} Questions</h3>
                                {(questionsBySection[cat] || []).map((q) => {
                                    const qIndex = findQuestionIndex(q);
                                    return (
                                     <Card key={qIndex} className="p-4 space-y-4 mb-4 relative">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Question {qIndex + 1}</h4>
                                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className='absolute top-2 right-2'>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Question Text</Label>
                                                {q.type === 'puzzle' ? (
                                                    <CodeBlock 
                                                        value={q.questionText || ''} 
                                                        onChange={(val) => handleQuestionChange(qIndex, 'questionText', val)}
                                                        language={q.language}
                                                    />
                                                ) : (
                                                    <Textarea 
                                                        value={q.questionText} 
                                                        onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                                    />
                                                )}
                                            </div>
                                            <div className='space-y-4'>
                                                <div className="space-y-2">
                                                    <Label>Type</Label>
                                                    <Select value={q.type} onValueChange={(val: QuestionType) => handleQuestionChange(qIndex, 'type', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="mcq">MCQ</SelectItem>
                                                            <SelectItem value="paragraph">Paragraph</SelectItem>
                                                            <SelectItem value="image-mcq">Image-based MCQ</SelectItem>
                                                            <SelectItem value="video-mcq">Video-based MCQ</SelectItem>
                                                            <SelectItem value="puzzle">Puzzle Solving</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {q.type === 'puzzle' && (
                                                    <div className="space-y-2">
                                                        <Label>Language</Label>
                                                        <Select value={q.language} onValueChange={(val: CodeLanguage) => handleQuestionChange(qIndex, 'language', val)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select language" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="javascript">JavaScript</SelectItem>
                                                                <SelectItem value="python">Python</SelectItem>
                                                                <SelectItem value="java">Java</SelectItem>
                                                                <SelectItem value="sql">SQL</SelectItem>
                                                                <SelectItem value="html">HTML</SelectItem>
                                                                <SelectItem value="css">CSS</SelectItem>
                                                                <SelectItem value="text">Plain Text</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                <div className='space-y-2'>
                                                    <Label>Marks</Label>
                                                    <Input type="number" value={q.marks ?? ''} onChange={e => handleQuestionChange(qIndex, 'marks', e.target.value === '' ? '' : parseInt(e.target.value, 10))}/>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {(q.type === 'image-mcq' || q.type === 'video-mcq') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.type === 'image-mcq' && (
                                                    <div className="space-y-2">
                                                        <Label>Image URL (Optional)</Label>
                                                        <div className="relative">
                                                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input value={q.imageUrl || ''} onChange={e => handleQuestionChange(qIndex, 'imageUrl', e.target.value)} placeholder="https://example.com/image.png" className="pl-9" />
                                                        </div>
                                                    </div>
                                                )}
                                                {q.type === 'video-mcq' && (
                                                    <div className="space-y-2">
                                                        <Label>Video URL (Optional)</Label>
                                                        <div className="relative">
                                                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input value={q.videoUrl || ''} onChange={e => handleQuestionChange(qIndex, 'videoUrl', e.target.value)} placeholder="https://youtube.com/embed/..." className="pl-9" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {q.type && mcqTypes.includes(q.type) ? (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Options</Label>
                                                    {q.options?.map((opt, oIndex) => (
                                                        <div key={oIndex} className="space-y-2">
                                                            <Label className='text-xs text-muted-foreground'>Option {oIndex + 1}</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
                                                                <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>Add Option</Button>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Correct Answer</Label>
                                                    <Select value={q.answer as string | undefined} onValueChange={(val) => handleQuestionChange(qIndex, 'answer', val)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select the correct answer" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {q.options?.filter(opt => opt.trim() !== '').map((opt, oIndex) => (
                                                                <SelectItem key={oIndex} value={opt}>
                                                                {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label>Correct Answer (Model Answer)</Label>
                                                {q.type === 'puzzle' ? (
                                                    <CodeBlock 
                                                        value={q.answer || ''} 
                                                        onChange={(val) => handleQuestionChange(qIndex, 'answer', val)}
                                                        language={q.language}
                                                        height="150px"
                                                    />
                                                ) : (
                                                    <Textarea 
                                                        value={q.answer as string || ''} 
                                                        onChange={(e) => handleQuestionChange(qIndex, 'answer', e.target.value)} 
                                                        placeholder="Provide the model answer here..."
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                   )
                                })}
                            </div>
                        ))}
                         <Button variant="outline" onClick={addQuestion}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Another Question
                        </Button>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-6">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={saveTest}>Save Test</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
