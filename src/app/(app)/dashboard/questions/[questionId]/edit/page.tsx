
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Question, QuestionType, CodeLanguage, QuestionCategory } from '@/lib/types';
import { useTestsStore } from '@/lib/store';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CodeBlock } from '@/components/ui/code-block';

export default function EditQuestionPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { tests: localTests, updateQuestion } = useTestsStore();
    
    const questionId = params.questionId as string;
    const [loading, setLoading] = useState(true);

    const [question, setQuestion] = useState<Partial<Question> | null>(null);
    const mcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];


    useEffect(() => {
        async function fetchQuestion() {
            setLoading(true);
            const allQuestions = localTests.flatMap(test => test.questions);
            const questionToEdit = allQuestions.find(q => q.id === questionId);
            
            if (questionToEdit) {
                 if (isFirebaseEnabled) {
                    try {
                        const questionRef = doc(db, 'tests', questionToEdit.testId, 'questions', questionId);
                        const questionSnap = await getDoc(questionRef);
                        if (questionSnap.exists()) {
                            setQuestion({ ...questionSnap.data(), id: questionSnap.id, testId: questionToEdit.testId } as Question);
                        } else {
                            throw new Error("Question not found in DB");
                        }
                    } catch (error) {
                         toast({ variant: 'destructive', title: 'Error fetching question from DB' });
                         setQuestion(questionToEdit); // Fallback to local
                    }
                } else {
                    setQuestion(questionToEdit);
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Question not found',
                    description: 'Could not locate the question in any test.'
                });
                router.back();
            }
            setLoading(false);
        }
       
       fetchQuestion();
    }, [questionId, localTests, router, toast]);

    const handleQuestionChange = (field: keyof Question, value: any) => {
        setQuestion(prev => {
            if (!prev) return null;

            let newQuestion = { ...prev, [field]: value };
            
            if (field === 'marks' && value === '') {
                 newQuestion = { ...prev, marks: undefined };
            } else if (field === 'marks') {
                newQuestion = { ...prev, marks: parseInt(value, 10)};
            }

             if (field === 'type') {
                if (!mcqTypes.includes(value)) {
                    delete newQuestion.options;
                    delete newQuestion.answer;
                } else if (mcqTypes.includes(value) && !newQuestion.options) {
                    newQuestion.options = ['', ''];
                    newQuestion.answer = '';
                }

                if (value === 'puzzle' && !newQuestion.language) {
                    newQuestion.language = 'javascript';
                } else if (value !== 'puzzle') {
                    delete newQuestion.language;
                }
            }

            return newQuestion;
        });
    };

    const handleOptionChange = (oIndex: number, value: string) => {
        setQuestion(prev => {
            if (!prev || !prev.options) return prev;
            const newOptions = [...prev.options];
            newOptions[oIndex] = value;

            if (prev.answer === prev.options[oIndex]) {
                return { ...prev, options: newOptions, answer: '' };
            }

            return { ...prev, options: newOptions };
        });
    };
    
    const addOption = () => {
        setQuestion(prev => {
            if (!prev || !prev.options) return prev;
            return { ...prev, options: [...prev.options, ''] };
        });
    };

    const removeOption = (oIndex: number) => {
        setQuestion(prev => {
            if (!prev || !prev.options || prev.options.length <= 2) {
                toast({
                    variant: 'destructive',
                    title: 'Cannot remove option',
                    description: 'This question must have at least two options.'
                });
                return prev;
            }
            const removedOption = prev.options[oIndex];
            const newOptions = prev.options.filter((_, i) => i !== oIndex);
            
            if (prev.answer === removedOption) {
                return { ...prev, options: newOptions, answer: '' };
            }

            return { ...prev, options: newOptions };
        });
    };
    
    const saveQuestion = () => {
        if (!question || !question.id) return;

        if (question.type && mcqTypes.includes(question.type) && (!question.answer || !question.options?.includes(question.answer))) {
            toast({
                variant: 'destructive',
                title: 'Invalid Answer',
                description: 'Please select a valid correct answer for the question.'
            });
            return;
        }
        
        const questionToSave = {
            ...question,
            marks: Number(question.marks) || 10
        };

        updateQuestion(questionToSave as Question);
        
        toast({
            title: 'Question Updated!',
            description: 'The question has been successfully updated.',
        });
        router.push('/dashboard/questions');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!question) {
        return <div>Question could not be loaded.</div>;
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Question Bank
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Question</CardTitle>
                    <CardDescription>Modify the details of the question below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Question Text</Label>
                            {question.type === 'puzzle' ? (
                                <CodeBlock 
                                    value={question.questionText || ''}
                                    onChange={(val) => handleQuestionChange('questionText', val)}
                                    language={question.language}
                                />
                            ) : (
                                <Textarea 
                                    value={question.questionText} 
                                    onChange={e => handleQuestionChange('questionText', e.target.value)} 
                                />
                            )}
                        </div>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>Type</Label>
                                <Select value={question.type} onValueChange={(val: QuestionType) => handleQuestionChange('type', val)}>
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
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={question.category} onValueChange={(val: QuestionCategory) => handleQuestionChange('category', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aptitude">Aptitude</SelectItem>
                                        <SelectItem value="logical">Logical</SelectItem>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="verbal">Verbal</SelectItem>
                                        <SelectItem value="general">General</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {question.type === 'puzzle' && (
                                <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select value={question.language} onValueChange={(val: CodeLanguage) => handleQuestionChange('language', val)}>
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
                                <Input type="number" value={question.marks ?? ''} onChange={e => handleQuestionChange('marks', e.target.value === '' ? '' : parseInt(e.target.value, 10))}/>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.type === 'image-mcq' && (
                            <div className="space-y-2">
                                <Label>Image URL (Optional)</Label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input value={question.imageUrl || ''} onChange={e => handleQuestionChange('imageUrl', e.target.value)} placeholder="https://example.com/image.png" className="pl-9" />
                                </div>
                            </div>
                        )}
                        {question.type === 'video-mcq' && (
                            <div className="space-y-2">
                                <Label>Video URL (Optional)</Label>
                                <div className="relative">
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input value={question.videoUrl || ''} onChange={e => handleQuestionChange('videoUrl', e.target.value)} placeholder="https://youtube.com/embed/..." className="pl-9" />
                                </div>
                            </div>
                        )}
                    </div>
                    {question.type && mcqTypes.includes(question.type) && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Options</Label>
                                {question.options?.map((opt, oIndex) => (
                                     <div key={oIndex} className="space-y-2">
                                        <Label className='text-xs text-muted-foreground'>Option {oIndex + 1}</Label>
                                        <div className="flex items-center gap-2">
                                            <Input value={opt} onChange={e => handleOptionChange(oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
                                            <Button variant="ghost" size="icon" onClick={() => removeOption(oIndex)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addOption}>Add Option</Button>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Correct Answer</Label>
                                <Select value={question.answer as string | undefined} onValueChange={(val) => handleQuestionChange('answer', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select the correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {question.options?.filter(opt => opt.trim() !== '').map((opt, oIndex) => (
                                            <SelectItem key={oIndex} value={opt}>
                                              {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={saveQuestion}>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
