
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTestsStore, useCandidatesStore, useSubmissionsStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Timer, Camera, AlertTriangle, Loader2, Link2, User, Code, Puzzle, Smartphone } from 'lucide-react';
import type { ProctoringLog, ProctoringStatus, Test, Candidate, Question, QuestionType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { CodeBlock } from '@/components/ui/code-block';
import { PreFlightChecks } from '@/components/pre-flight-checks';

const MAX_VIOLATIONS = 3;
const VIOLATION_COOLDOWN = 10000; // 10 seconds

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const { testId, candidateId } = params as {testId: string, candidateId: string};
  const { toast } = useToast();
  const { addSubmission } = useSubmissionsStore();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Zustand stores for non-firebase mode
  const { tests: localTests } = useTestsStore();
  const { candidates: localCandidates } = useCandidatesStore();

  const [test, setTest] = useState<Test | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [proctoringStatus, setProctoringStatus] = useState<ProctoringStatus>('present');
  const [proctoringLogs, setProctoringLogs] = useState<Omit<ProctoringLog, 'id'>[]>([]);
  const noFaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [onViolationCooldown, setOnViolationCooldown] = useState(false);
  const [checksComplete, setChecksComplete] = useState(false);
  
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const MAX_FULLSCREEN_EXITS = 3;

  const loadFromLocal = () => {
    const localTest = localTests.find(t => t.id === testId);
    const localCandidate = localCandidates.find(c => c.id === candidateId);
    setTest(localTest || null);
    setCandidate(localCandidate || null);
    if(localTest) {
        setTimeLeft(localTest.timeLimit * 60);
    }
  }

  useEffect(() => {
    async function fetchData() {
        if (!testId || !candidateId) return;

        setIsLoading(true);

        if (isFirebaseEnabled) {
            try {
                let testFound: Test | null = null;
                // Fetch test
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);

                if (testSnap.exists()) {
                    const testData = { id: testSnap.id, ...testSnap.data() } as Test;
                    
                    // Fetch questions subcollection
                    const questionsRef = collection(db, 'tests', testId, 'questions');
                    const questionsSnap = await getDocs(questionsRef);
                    testData.questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];

                    setTest(testData);
                    setTimeLeft(testData.timeLimit * 60);
                    testFound = testData;
                }

                // Fetch candidate
                const candidateRef = doc(db, 'candidates', candidateId);
                const candidateSnap = await getDoc(candidateRef);

                if (candidateSnap.exists()) {
                    setCandidate({ id: candidateSnap.id, ...candidateSnap.data() } as Candidate);
                }

                if (!testFound) {
                    console.error("Test not found in Firestore, falling back to local data.");
                    loadFromLocal();
                }

            } catch (error) {
                console.error("Error fetching data from Firestore:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error loading test data',
                    description: 'Could not load the required test information.'
                });
                loadFromLocal(); // Fallback on error as well
            }
        } else {
            // Fallback to Zustand store if Firebase is not enabled
            loadFromLocal();
        }
        setIsLoading(false);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, candidateId, toast]);


  // Timer useEffect
  useEffect(() => {
    if (testStarted && !testSubmitted) {
      const timer = setInterval(() => {
        setNow(new Date());
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            startTransition(() => {
                submitTest('Your time is up. The test has been automatically submitted.');
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted, testSubmitted]);

  // Attach stream to video element
  useEffect(() => {
    if (!testStarted || testSubmitted) return;

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
         if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
         }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted, testSubmitted]);

  // Tab visibility and proctoring useEffect
  useEffect(() => {
    if (!testStarted || testSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('You have switched to another tab. This is a violation of the test rules.', 'tab_switch');
      }
    };
    
    const handleFullscreenChange = (event: Event) => {
        if (!document.fullscreenElement) {
            // Check if the exit was triggered by the F11 key
            if ((event.target as Document).activeElement === null || (event.target as Document).activeElement === document.body) {
                // This is likely an F11 exit. Handle it.
                setFullscreenExits(prev => prev + 1);
                if (fullscreenExits + 1 > MAX_FULLSCREEN_EXITS) {
                    handleViolation('You have exited fullscreen mode multiple times.', 'browser');
                } else {
                    handleViolation(`You have exited fullscreen mode. This is warning ${fullscreenExits + 1} of ${MAX_FULLSCREEN_EXITS}.`, 'browser');
                    // Re-enter fullscreen
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            }
        }
    };

    const checkFace = () => {
      const isFaceDetected = Math.random() > 0.1; // Placeholder for actual face detection
      if (!isFaceDetected) {
        if (!noFaceTimeoutRef.current) {
          noFaceTimeoutRef.current = setTimeout(() => {
            handleViolation('No face detected in the camera feed.', 'no_face');
          }, 3000); // Trigger after 3 seconds of no face
        }
      } else {
        if (noFaceTimeoutRef.current) {
          clearTimeout(noFaceTimeoutRef.current);
          noFaceTimeoutRef.current = null;
        }
      }
    };
    
    const checkMobile = () => {
        const isMobileDetected = Math.random() < 0.005; // Simulate a rare mobile detection event
        if (isMobileDetected) {
            handleViolation('A mobile phone has been detected. This is a violation of the test rules.', 'mobile_phone');
        }
    }

    const proctoringInterval = setInterval(() => {
        checkFace();
        checkMobile();
    }, 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      clearInterval(proctoringInterval);
      if (noFaceTimeoutRef.current) {
          clearTimeout(noFaceTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStarted, testSubmitted, onViolationCooldown, fullscreenExits]);

  // Effect to handle automatic submission after max violations
  useEffect(() => {
    if (violationCount >= MAX_VIOLATIONS) {
      startTransition(() => {
        submitTest('Multiple violations detected. The test has been automatically submitted.');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationCount]);

  const handleViolation = (message: string, status: ProctoringStatus) => {
    if (onViolationCooldown || testSubmitted) return;

    setViolationCount(prev => prev + 1);
    setViolationMessage(message);
    setProctoringStatus(status);

    if (test && candidate) {
        const newLog: Omit<ProctoringLog, 'id'> = {
            testId: test.id,
            candidateId: candidate.id,
            timestamp: new Date().toISOString(),
            status: status
        };
        setProctoringLogs(prev => [...prev, newLog]);
    }

    setShowViolationWarning(true);
    setOnViolationCooldown(true);
    setTimeout(() => {
      setOnViolationCooldown(false);
      // Reset status to 'present' after cooldown if no new violations
      setProctoringStatus('present');
    }, VIOLATION_COOLDOWN);
  }

  const startTest = async () => {
    if (!checksComplete) {
      toast({
        variant: 'destructive',
        title: 'System Check Not Complete',
        description: 'Please run and pass all system checks before starting.',
      });
      return;
    }
     try {
        await document.documentElement.requestFullscreen();
    } catch (err) {
        toast({
            variant: 'destructive',
            title: 'Fullscreen Required',
            description: 'Please allow fullscreen mode to start the test.',
        });
        return;
    }
    setTestStarted(true);
    setStartTime(new Date());
    setShowStartDialog(false);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const goToNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitTest = (toastMessage?: string) => {
    if (!test || !candidate || testSubmitted) return;

    setTestSubmitted(true); // Prevent multiple submissions
    const endTime = new Date();
    const timeTaken = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : (test.timeLimit * 60) - timeLeft;
    
    // Exit fullscreen on submit
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    const submission: Omit<Submission, 'result'> = {
        id: `sub-${Date.now()}`,
        testId: test.id,
        candidateId: candidate.id,
        answers: answers,
        score: null,
        status: 'evaluating' as const,
        submittedAt: new Date().toISOString()
    };
    addSubmission(submission, proctoringLogs, test, timeTaken);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if(toastMessage) {
      toast({
        variant: 'destructive',
        title: 'Test Auto-Submitted',
        description: toastMessage,
        duration: 5000,
      })
    }

    // Delay redirection to allow user to see toast
    setTimeout(() => {
        router.push(`/completed?submissionId=${submission.id}`);
    }, toastMessage ? 2000 : 0);
  };

    const getYouTubeEmbedUrl = (url: string) => {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1];
        } else if (url.includes('watch?v=')) {
            videoId = url.split('watch?v=')[1];
        } else {
            return url; // Return original if not a standard YouTube URL
        }
        const ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
        return `https://www.youtube.com/embed/${videoId}`;
    };

    const getGoogleDriveImageUrl = (url: string) => {
        if (!url.includes('drive.google.com')) {
            return url;
        }
        const fileIdMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
        }
        return url;
    };


  if (isLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading test...</p>
        </div>
    )
  }

  if (!test || !candidate) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Test or candidate not found.</p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="secondary" className='bg-green-500'>Present</Badge>;
      case 'no_face':
        return <Badge variant="outline" className="border-accent text-accent-foreground">No Face</Badge>;
      case 'multiple_faces':
        return <Badge variant="destructive">Multiple Faces</Badge>;
       case 'tab_switch':
        return <Badge variant="destructive" className="bg-yellow-500 text-white"><Link2 className='w-3 h-3 mr-1'/>Tab Switch</Badge>;
       case 'mobile_phone':
        return <Badge variant="destructive"><Smartphone className='w-3 h-3 mr-1'/>Phone</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const mcqTypes: QuestionType[] = ['mcq', 'image-mcq', 'video-mcq'];


  return (
    <>
      <AlertDialog open={showStartDialog && !testStarted}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>System Check for: {test.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Before you begin, please complete the following system checks to ensure a smooth test experience. The test will start in fullscreen mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <PreFlightChecks onChecksComplete={setChecksComplete} />
          <AlertDialogFooter>
            <Button onClick={startTest} disabled={!checksComplete}>Start Test</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showViolationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
                <AlertTriangle className='text-destructive' /> Proctoring Warning ({violationCount}/{MAX_VIOLATIONS})
            </AlertDialogTitle>
            <AlertDialogDescription>
              {violationMessage}
              <br/><br/>
              Your test will be automatically submitted if you exceed {MAX_VIOLATIONS} violations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowViolationWarning(false)}>I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {testStarted && (
         <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
            <Card className="flex-1 w-full overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{test.title}</CardTitle>
                  <div className="flex items-center gap-2 text-lg font-medium text-destructive">
                    <Timer className="h-5 w-5" />
                    {formatTime(timeLeft)}
                  </div>
                </div>
                 <div className="flex items-center justify-between">
                    <CardDescription>
                    Question {currentQuestionIndex + 1} of {test.questions.length}
                    </CardDescription>
                    {currentQuestion && (
                        <Badge variant="outline">{currentQuestion.marks} Marks</Badge>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-6" />
                {currentQuestion ? (
                  <div className="space-y-4">
                     <div className="flex justify-between items-start gap-4">
                      {currentQuestion.type === 'puzzle' ? (
                          <CodeBlock
                            value={currentQuestion.questionText}
                            language={currentQuestion.language}
                            readOnly
                            height='200px'
                            className='w-full'
                           />
                      ) : (
                        <p className="font-semibold text-lg flex-1 whitespace-pre-wrap">{currentQuestion.questionText}</p>
                      )}
                      
                      {currentQuestion.type === 'puzzle' && currentQuestion.language && (
                        <Badge variant="outline" className="capitalize flex items-center gap-1">
                          <Puzzle className="h-3 w-3" />
                          {currentQuestion.language}
                        </Badge>
                      )}
                    </div>
                     {(currentQuestion.imageUrl || currentQuestion.videoUrl) && (
                        <div className='my-4 rounded-lg overflow-hidden border w-full md:w-2/3 mx-auto'>
                            {currentQuestion.imageUrl && (
                                <div className="relative h-80 w-full">
                                    <Image src={getGoogleDriveImageUrl(currentQuestion.imageUrl)} alt={`Question image`} fill className="object-contain" />
                                </div>
                            )}
                            {currentQuestion.videoUrl && (
                                <div className='aspect-video'>
                                    <iframe
                                        className="w-full h-full"
                                        src={getYouTubeEmbedUrl(currentQuestion.videoUrl)}
                                        title={`Question video`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    )}
                    <div className='space-y-2 pt-4'>
                        <Label className='font-semibold'>Answer:</Label>
                        {mcqTypes.includes(currentQuestion.type) && currentQuestion.options && (
                        <RadioGroup
                            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                            value={answers[currentQuestion.id]}
                            className="space-y-2"
                        >
                            {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`q${currentQuestion.id}-o${index}`} />
                            <Label htmlFor={`q${currentQuestion.id}-o${index}`} className="cursor-pointer">{option}</Label>
                            </div>
                            ))}
                        </RadioGroup>
                        )}
                        {(currentQuestion.type === 'paragraph') && (
                        <Textarea
                            rows={10}
                            placeholder={"Type your answer here..."}
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        />
                        )}
                        {currentQuestion.type === 'puzzle' && (
                            <CodeBlock 
                                value={answers[currentQuestion.id] || ''}
                                onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                                language={currentQuestion.language}
                                height='300px'
                            />
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
                    Previous
                  </Button>
                  {currentQuestionIndex < test.questions.length - 1 ? (
                    <Button onClick={goToNextQuestion}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={() => startTransition(() => submitTest())} variant="destructive">
                      Submit Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="w-full md:w-64 space-y-4 shrink-0">
                <Card className="w-full">
                    <CardHeader className="p-0 overflow-hidden rounded-t-lg">
                        <div className="relative aspect-video w-full">
                            <video ref={videoRef} className="w-full h-full object-cover bg-muted" autoPlay muted playsInline />
                             {now && (
                                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-1 rounded-md">
                                    <p>{now.toLocaleDateString()}</p>
                                    <p>{now.toLocaleTimeString()}</p>
                                </div>
                            )}
                            {hasCameraPermission === false && (
                                <div className='absolute inset-0 bg-black/80 flex items-center justify-center p-2 text-center'>
                                    <Alert variant="destructive" className='text-xs'>
                                    <AlertTitle className='text-sm'>Camera Issue</AlertTitle>
                                    <AlertDescription>
                                        Enable camera access to continue.
                                    </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                        <div className='flex items-center gap-2'>
                             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className='text-sm font-medium leading-tight'>{candidate.name}</p>
                                <p className='text-xs text-muted-foreground truncate'>{candidate.email}</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                                <Camera className="h-5 w-5 text-muted-foreground"/>
                                <span className="text-sm font-medium">Proctoring</span>
                           </div>
                           <Badge variant="secondary" className="bg-green-500/20 text-green-700">On</Badge>
                        </div>
                         <div className="flex items-center justify-between">
                           <span className="text-sm text-muted-foreground">Status</span>
                           {getStatusBadge(proctoringStatus)}
                        </div>
                         <div className="flex items-center justify-between">
                           <span className="text-sm text-muted-foreground">Violations</span>
                           <Badge variant={violationCount > 0 ? "destructive" : "secondary"}>{violationCount} / {MAX_VIOLATIONS}</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

         </div>
      )}
    </>
  );
}
