
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSubmissionsStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, Download, Eye, User, Loader2, Trash2, Edit, Check, X, Target, FileText, Bot } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Question, Submission, Test, Candidate, ManualEvaluation, QuestionType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportTemplate } from '@/components/pdf/report-template';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CodeBlock } from '@/components/ui/code-block';
import Image from 'next/image';
import { getAIEvaluation } from '@/lib/actions';

export default function EvaluationPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const { submissions: localSubmissions, deleteSubmission, updateSubmission } = useSubmissionsStore();

    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [isEvaluating, startAIEvaluation] = useTransition();
    const [aiFeedback, setAiFeedback] = useState<Record<string, { feedback: string; suggestedScore: number }>>({});


    const [submission, setSubmission] = useState<Submission | null>(null);
    const [test, setTest] = useState<Test | null>(null);
    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [evaluations, setEvaluations] = useState<Record<string, ManualEvaluation>>({});


    const submissionId = params.submissionId as string;
    const reportRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      async function fetchData() {
        if (!submissionId) return;

        setLoading(true);

        try {
          let subData: Submission | null = null;
          let testData: Test | null = null;
          let candidateData: Candidate | null = null;

          if (isFirebaseEnabled) {
              const submissionRef = doc(db, 'submissions', submissionId);
              const submissionSnap = await getDoc(submissionRef);

              if (!submissionSnap.exists()) throw new Error("Submission not found");
              subData = { id: submissionSnap.id, ...submissionSnap.data() } as Submission;
              
              const testRef = doc(db, 'tests', subData.testId);
              const testSnap = await getDoc(testRef);
              if (!testSnap.exists()) throw new Error("Test not found");
              
              testData = { id: testSnap.id, ...testSnap.data() } as Test;

              const questionsRef = collection(db, 'tests', subData.testId, 'questions');
              const questionsSnap = await getDocs(questionsRef);
              testData.questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);

              const candidateRef = doc(db, 'candidates', subData.candidateId);
              const candidateSnap = await getDoc(candidateRef);
              if (!candidateSnap.exists()) throw new Error("Candidate not found");
              candidateData = { id: candidateSnap.id, ...candidateSnap.data() } as Candidate;
          } else {
              const { tests } = (await import('@/lib/store')).useTestsStore.getState();
              const { candidates } = (await import('@/lib/data'));

              subData = localSubmissions.find(s => s.id === submissionId) || null;
              if (subData) {
                  testData = tests.find(t => t.id === subData.testId) || null;
                  candidateData = candidates.find(c => c.id === subData.candidateId) || null;
              }
          }

          setSubmission(subData);
          setTest(testData);
          setCandidate(candidateData);
          if (subData?.evaluations) {
            setEvaluations(subData.evaluations);
          }
          
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error loading data', description: error.message });
            router.back();
        }
        setLoading(false);
      }
      fetchData();
    }, [submissionId, router, toast, localSubmissions]);
    
    const handleDeleteSubmission = async () => {
        if (!submission) return;
        try {
            await deleteSubmission(submission.id);
            toast({ title: "Submission Deleted", description: "The test submission has been removed." });
            router.push('/evaluator');
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete submission."});
        } finally {
            setShowDeleteConfirm(false);
        }
    }

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleDownload = async () => {
        if (!reportRef.current || !candidate) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const width = pdfWidth;
            const height = width / ratio;

            let finalHeight = height;
            if (height > pdfHeight) {
                finalHeight = pdfHeight;
            }

            pdf.addImage(imgData, 'PNG', 0, 0, width, finalHeight);
            pdf.save(`${candidate.name}-Result.pdf`);

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not generate the PDF report.'
            })
        } finally {
            setIsDownloading(false);
        }
    };

    const handleEvaluationChange = (questionId: string, field: keyof ManualEvaluation, value: string | number) => {
        setEvaluations(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [field]: field === 'score' ? Number(value) : value
            }
        }))
    }
    
    const handleGetAIEvaluation = (question: Question, answer: string) => {
        startAIEvaluation(async () => {
            const input = {
                questionText: question.questionText,
                questionType: question.type,
                answer: answer,
                marks: question.marks,
            };
            const result = await getAIEvaluation(input);
            if (result.error) {
                toast({ variant: 'destructive', title: 'AI Evaluation Failed', description: result.error });
            } else if (result.data) {
                setAiFeedback(prev => ({...prev, [question.id]: result.data!}));
                handleEvaluationChange(question.id, 'score', result.data.suggestedScore);
                handleEvaluationChange(question.id, 'feedback', result.data.feedback);
                toast({ title: 'AI Suggestion Applied', description: 'The AI feedback and suggested score have been filled in.' });
            }
        });
    }

    const handleSaveEvaluation = () => {
        if (!test || !submission) return;
        startSaving(async () => {
            let totalScore = 0;
            const allMcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];
            
            test.questions.forEach(question => {
                const answer = submission.answers[question.id];
                if (allMcqTypes.includes(question.type)) {
                     if (answer && answer === question.answer) {
                        totalScore += question.marks || 0;
                    }
                } else {
                    const currentEvaluation = evaluations[question.id];
                    if (currentEvaluation?.score !== undefined) {
                        totalScore += currentEvaluation.score;
                    } else if (submission.evaluations?.[question.id]?.score !== undefined) {
                        totalScore += submission.evaluations?.[question.id].score!;
                    }
                }
            });
            
            const finalResult: Partial<Submission> = {
                score: totalScore,
                status: 'completed',
                evaluations,
                result: totalScore >= test.passingScore ? 'pass' : 'fail'
            };
            
            await updateSubmission(submission.id, finalResult);
            
            setSubmission(prev => prev ? { ...prev, ...finalResult } as Submission : null);

            toast({
                title: 'Evaluation Submitted!',
                description: 'The candidate\'s score and result have been updated.'
            });
        });
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

    if (!test || !submission || !candidate) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center">
                <CardTitle>Submission not found</CardTitle>
                <CardDescription>This submission could not be found.</CardDescription>
                <Button onClick={() => router.back()} variant="link" className="mt-4">Go Back</Button>
            </div>
        );
    }
    
    const totalMarks = test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const scorePercentage = totalMarks > 0 && submission.score !== null && submission.score !== undefined ? Math.round((submission.score / totalMarks) * 100) : 0;
    const timeTaken = submission.timeTaken || 0;
    const resultText = submission.result === 'pass' ? 'Passed' : 'Failed';

    const getGradeDetails = (percentage: number) => {
        if (percentage >= 90) return { grade: 'Excellent', description: 'Outstanding performance. Keep up the great work!' };
        if (percentage >= 75) return { grade: 'Good', description: 'Solid performance with a good understanding of the topics.' };
        if (percentage >= 60) return { grade: 'Satisfactory', description: 'Passed the assessment, but there are areas for improvement.' };
        return { grade: 'Needs Improvement', description: 'Did not meet the passing criteria. Further review is recommended.' };
    }
    
    const { grade, description: gradeDescription } = getGradeDetails(scorePercentage);
    
    const categoryScores = test.questions.reduce((acc, question) => {
        const category = question.category || 'general';
        if (!acc[category]) {
            acc[category] = { total: 0, scored: 0 };
        }
        acc[category].total += question.marks || 0;
        
        const answer = submission.answers[question.id];
        const allMcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];

        if (allMcqTypes.includes(question.type)) {
             if (answer && answer === question.answer) {
                acc[category].scored += question.marks || 0;
            }
        } else {
            const evaluation = submission.status === 'completed' 
                ? (submission.evaluations?.[question.id] || evaluations[question.id]) 
                : evaluations[question.id];
            
            if (evaluation?.score) {
                 acc[category].scored += evaluation.score;
            }
        }

        return acc;
    }, {} as Record<string, { total: number, scored: number }>);
    
    const chartData = Object.entries(categoryScores).map(([name, data], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        score: data.total > 0 ? Math.round((data.scored / data.total) * 100) : 0,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));
    
    const sectionScoresForPdf = Object.entries(categoryScores).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        scored: data.scored,
        total: data.total
    }));
    
    const showManualEvaluationSection = submission.status === 'evaluating' && test.questions.some(q => !['mcq', 'image-mcq', 'video-mcq'].includes(q.type));
    const showSubmitButton = submission.status === 'evaluating';


    const getYouTubeEmbedUrl = (url: string) => {
        if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}`;
        if (url.includes('watch?v=')) return `https://www.youtube.com/embed/${url.split('watch?v=')[1].split('&')[0]}`;
        return url;
    };
    const getGoogleDriveImageUrl = (url: string) => {
        const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        return match ? `https://drive.google.com/uc?id=${match[1]}` : url;
    };


    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <div className="space-y-6">
             <div className='flex justify-between items-center'>
                <h1 className='text-2xl font-semibold'>Assessment Evaluation</h1>
                <div className='flex items-center gap-2'>
                    {showSubmitButton && (
                        <Button onClick={handleSaveEvaluation} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Submit Evaluation
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Submissions
                    </Button>
                </div>
            </div>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the submission and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubmission} className='bg-destructive hover:bg-destructive/90'>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Submission
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <aside className='lg:col-span-1 space-y-6'>
                     <Card>
                        <CardHeader>
                             <CardTitle className='pt-2 flex items-center gap-2'><FileText/> Test Configuration</CardTitle>
                             <CardDescription className='capitalize'>{test.category} Test</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Passing Score</span>
                                <span className="font-medium">{test.passingScore} / {totalMarks}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Time Limit</span>
                                <span className="font-medium">{test.timeLimit} minutes</span>
                             </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Evaluation</span>
                                <span className="font-medium capitalize">{test.evaluationMode}</span>
                             </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Test progress &amp; results</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-1'>
                            <Button variant='ghost' className='w-full justify-start text-muted-foreground' onClick={() => scrollToSection('respondent-card')}>
                                <User className='mr-2' /> Respondent
                            </Button>
                            <Button variant='ghost' className='w-full justify-start text-muted-foreground' onClick={() => scrollToSection('result-card')}>
                                <Target className='mr-2' /> Result
                            </Button>
                             <Button variant='secondary' className='w-full justify-start font-semibold' onClick={() => scrollToSection('answer-sheet-card')}>
                                <CheckCircle className='mr-2' /> Test sheets review
                            </Button>
                        </CardContent>
                        <CardFooter>
                            <Button className='w-full' variant='destructive' onClick={() => setShowDeleteConfirm(true)}>Delete Submission</Button>
                        </CardFooter>
                    </Card>
                </aside>

                <main className='lg:col-span-2 space-y-6'>
                    <Card id="respondent-card">
                        <CardHeader>
                           <div className='flex justify-between items-center'>
                             <h2 className='text-xl font-semibold'>Test sheets review</h2>
                             <div className='flex items-center gap-2'>
                                <span className='text-sm text-muted-foreground'>Respondent</span>
                                <Badge variant='outline'>{candidate.name}</Badge>
                             </div>
                           </div>
                           <Separator/>
                           <div className='flex justify-end items-center gap-2 pt-2'>
                                <Button variant='outline' size='sm' onClick={() => router.push(`/test/${candidate.id}/${test.id}`)}><Eye className='mr-2'/>Respondent view</Button>
                                <Button variant='outline' size='sm' onClick={handleDownload} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className='mr-2' />}
                                    Download
                                </Button>
                           </div>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <h3 className='font-semibold'>RESPONDENT</h3>
                            <div className='flex items-center gap-4'>
                                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                                    <User className='h-6 w-6 text-muted-foreground'/>
                                </div>
                                <div>
                                    <p className='font-bold text-lg'>{candidate.name}</p>
                                    <p className='text-sm text-muted-foreground'>{candidate.email}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2 text-sm'>
                                <CheckCircle className='h-5 w-5 text-green-600'/>
                                <span className='font-medium'>Consent on start page</span>
                                <span className='text-muted-foreground'>I agree with the Terms and Conditions...</span>
                            </div>
                        </CardContent>
                    </Card>

                     <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <Card id="result-card">
                            <CardHeader>
                                <CardTitle className='text-base'>RESULT</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-center">
                                {submission.status === 'completed' ? (
                                    <>
                                        <div className="text-5xl font-bold">{scorePercentage}%</div>
                                        <div className="space-y-1">
                                            <p className={`font-bold text-lg ${resultText === 'Passed' ? 'text-primary' : 'text-destructive'}`}>
                                                Test {resultText}
                                            </p>
                                            <p className='text-sm'><span className='text-muted-foreground'>Grade:</span> {grade}</p>
                                            <p className='text-sm text-muted-foreground'>{gradeDescription}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <Clock className="h-8 w-8 mb-2"/>
                                        <p>Evaluation Pending</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card id="timer-card">
                            <CardHeader>
                                <CardTitle className='text-base flex items-center gap-2'><Clock/>TIMER</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className='text-muted-foreground text-sm'>Total time</p>
                                <p className='text-2xl font-bold'>{formatTime(timeTaken)}</p>
                                <Progress value={(timeTaken/(test.timeLimit*60)) * 100} className='mt-2 h-2'/>
                            </CardContent>
                        </Card>
                     </div>

                    <Card id="category-scores-card">
                        <CardHeader>
                            <CardTitle className='text-base'>SCORE PER CATEGORY</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                             {submission.status === 'completed' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 50, right: 10 }}>
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            axisLine={false} 
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                            width={100}
                                            style={{ textAnchor: 'start' }}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: 'var(--radius)'
                                            }}
                                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Bar dataKey="score" radius={[4, 4, 4, 4]} />
                                    </BarChart>
                                </ResponsiveContainer>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Clock className="h-8 w-8 mb-2"/>
                                    <p>Awaiting final evaluation</p>
                                </div>
                             )}
                        </CardContent>
                    </Card>

                    <Card id="answer-sheet-card">
                        <CardHeader>
                            <CardTitle>Answer Sheet</CardTitle>
                            <CardDescription>Detailed review of the candidate&apos;s answers.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {test.questions.map((q, index) => {
                                const candidateAnswer = submission.answers[q.id];
                                const allMcqTypes = ['mcq', 'image-mcq', 'video-mcq'];
                                const isMcq = allMcqTypes.includes(q.type);
                                const evaluation = submission.evaluations?.[q.id];
                                const isCorrect = isMcq && candidateAnswer === q.answer;

                                return (
                                    <div key={q.id} className="space-y-4 rounded-lg border p-4">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium flex-1 pr-4">{index + 1}. {q.questionText}</h4>
                                                <Badge variant="outline">{q.marks} Marks</Badge>
                                            </div>
                                            {(q.imageUrl || q.videoUrl) && (
                                                <div className='mt-4 w-full md:w-2/3 mx-auto'>
                                                    {q.imageUrl && (
                                                        <div className="relative aspect-video w-full rounded-md overflow-hidden">
                                                            <Image src={getGoogleDriveImageUrl(q.imageUrl)} alt={`Question ${index+1} image`} fill className="object-contain" />
                                                        </div>
                                                    )}
                                                    {q.videoUrl && (
                                                        <div className='aspect-video'>
                                                            <iframe
                                                                className="w-full h-full rounded-md"
                                                                src={getYouTubeEmbedUrl(q.videoUrl)}
                                                                title={`Question ${index+1} video`}
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Separator/>
                                        {isMcq ? (
                                            <div className="space-y-2">
                                                <Label className='text-xs text-muted-foreground'>Options</Label>
                                                {q.options?.map((opt, i) => {
                                                    const isCandidateAnswer = candidateAnswer === opt;
                                                    const isCorrectAnswer = q.answer === opt;
                                                    
                                                    return (
                                                        <div key={i} className={`flex items-center gap-3 p-2 rounded-md text-sm
                                                            ${isCandidateAnswer && !isCorrectAnswer ? 'bg-destructive/10 border border-destructive/20' : ''}
                                                            ${isCorrectAnswer ? 'bg-green-500/10 border border-green-500/20' : ''}
                                                        `}>
                                                            {isCorrectAnswer ? <Check className='h-4 w-4 text-green-600' /> : isCandidateAnswer ? <X className='h-4 w-4 text-destructive' /> : <div className='w-4 h-4' />}
                                                            <span className={`${isCorrectAnswer ? 'text-green-800 dark:text-green-300 font-medium' : ''} ${isCandidateAnswer && !isCorrectAnswer ? 'text-destructive line-through' : ''}`}>{opt}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <>
                                                <div className='space-y-2'>
                                                    <Label className='text-xs text-muted-foreground'>Candidate&apos;s Answer</Label>
                                                    {q.type === 'puzzle' ? (
                                                        <CodeBlock language={q.language} value={candidateAnswer || ''} readOnly height="200px" />
                                                    ) : (
                                                        <Textarea value={candidateAnswer || ''} readOnly rows={5}/>
                                                    )}
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-xs text-muted-foreground'>Model Answer</Label>
                                                     {q.type === 'puzzle' ? (
                                                        <CodeBlock language={q.language} value={q.answer} readOnly height="200px" />
                                                    ) : (
                                                        <Textarea value={q.answer} readOnly rows={3} className='text-sm bg-muted/50' />
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {evaluation && (
                                            <div className='bg-muted/50 p-3 rounded-lg space-y-2'>
                                                <div className="flex justify-between items-center">
                                                    <Label>Evaluation</Label>
                                                    <Badge variant='secondary'>Score: {evaluation.score}/{q.marks}</Badge>
                                                </div>
                                                {evaluation.feedback && <p className='text-sm'>&quot;{evaluation.feedback}&quot;</p>}
                                            </div>
                                        )}
                                         {!isMcq && !evaluation && submission.status === 'evaluating' && (
                                            <div className='bg-yellow-500/10 p-3 rounded-lg space-y-2 text-yellow-700 dark:text-yellow-300'>
                                                <p className='text-sm font-medium'>This question needs to be manually evaluated.</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {showManualEvaluationSection && (
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'><Edit/>Manual Evaluation</CardTitle>
                                <CardDescription>Score the candidate&apos;s answers for the following questions. The final evaluation will be based on these scores.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {test.questions.filter(q => !['mcq', 'image-mcq', 'video-mcq'].includes(q.type)).map((q, index) => (
                                    <div key={q.id} className="space-y-4 rounded-lg border p-4">
                                        <div>
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">{index + 1}. {q.questionText}</h4>
                                                <Badge variant="outline">{q.marks} Marks</Badge>
                                            </div>
                                        </div>
                                        <Separator/>
                                        <div className='space-y-2'>
                                            <Label className='text-xs text-muted-foreground'>Candidate&apos;s Answer</Label>
                                            {q.type === 'puzzle' ? (
                                                <CodeBlock language={q.language} value={submission.answers[q.id] || ''} readOnly height="200px" />
                                            ) : (
                                                <Textarea value={submission.answers[q.id] || ''} readOnly rows={5}/>
                                            )}
                                        </div>
                                         <div className='space-y-2'>
                                            <Label className='text-xs text-muted-foreground'>Model Answer</Label>
                                            {q.type === 'puzzle' ? (
                                                <CodeBlock language={q.language} value={q.answer} readOnly height="200px" />
                                            ) : (
                                                <Textarea value={q.answer} readOnly rows={3} className='text-sm bg-muted/50' />
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor={`score-${q.id}`}>Score Awarded</Label>
                                                <Input 
                                                    id={`score-${q.id}`} 
                                                    type="number" 
                                                    max={q.marks} 
                                                    min={0}
                                                    value={evaluations[q.id]?.score ?? ''}
                                                    onChange={(e) => handleEvaluationChange(q.id, 'score', e.target.value)}
                                                    placeholder={`Enter score (out of ${q.marks})`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`feedback-${q.id}`}>Feedback (Optional)</Label>
                                                <Textarea 
                                                    id={`feedback-${q.id}`} 
                                                    value={evaluations[q.id]?.feedback ?? ''}
                                                    onChange={(e) => handleEvaluationChange(q.id, 'feedback', e.target.value)}
                                                    placeholder="Provide feedback on the answer..."
                                                />
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleGetAIEvaluation(q, submission.answers[q.id] || '')} disabled={isEvaluating}>
                                            {isEvaluating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4"/>}
                                            Get AI Suggestion
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
             {/* Hidden div for PDF generation */}
            <div className="absolute -left-[9999px] -top-[9999px]">
                <div ref={reportRef}>
                     <ReportTemplate submission={submission} test={test} candidate={candidate} sectionScores={sectionScoresForPdf} />
                </div>
            </div>
        </div>
    );
}
