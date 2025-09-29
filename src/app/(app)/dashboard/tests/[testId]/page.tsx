

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Clock, Loader2, Image as ImageIcon, Video, Type, Puzzle, Target } from 'lucide-react';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { Test, Question, Candidate } from '@/lib/types';
import Image from 'next/image';

export default function TestDetailsPage() {
    const router = useRouter();
    const params = useParams();
    
    const [test, setTest] = useState<Test | null>(null);
    const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);

    const testId = params.testId as string;

    useEffect(() => {
        async function fetchData() {
            if (!isFirebaseEnabled) {
                // Fallback for non-firebase env
                const { tests } = (await import('@/lib/store')).useTestsStore.getState();
                const { candidates } = (await import('@/lib/data'));
                setTest(tests.find(t => t.id === testId) || null);
                setAllCandidates(candidates);
                setLoading(false);
                return;
            }

            try {
                // Fetch Test
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);

                if (testSnap.exists()) {
                    const testData = { id: testSnap.id, ...testSnap.data() } as Test;
                    
                    // Fetch questions subcollection
                    const questionsRef = collection(db, 'tests', testId, 'questions');
                    const questionsSnap = await getDocs(questionsRef);
                    testData.questions = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];
                    
                    setTest(testData);
                }

                // Fetch all candidates to resolve names
                const candidatesSnap = await getDocs(collection(db, 'candidates'));
                setAllCandidates(candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
                
            } catch (error) {
                console.error("Failed to fetch test details:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [testId]);

    const getQuestionTypeBadge = (type: string) => {
        switch(type) {
            case 'mcq': return <Badge variant="secondary">MCQ</Badge>
            case 'puzzle': return <Badge variant="default"><Puzzle className='w-3 h-3 mr-1'/>Puzzle</Badge>
            case 'paragraph': return <Badge variant="outline"><Type className='w-3 h-3 mr-1'/>Paragraph</Badge>
            case 'image-mcq': return <Badge variant="outline"><ImageIcon className='w-3 h-3 mr-1'/>Image MCQ</Badge>
            case 'video-mcq': return <Badge variant="outline"><Video className='w-3 h-3 mr-1'/>Video MCQ</Badge>
            default: return <Badge>{type}</Badge>
        }
    }
    
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


    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!test) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <CardTitle>Test not found</CardTitle>
                <CardDescription>This test could not be found.</CardDescription>
                <Button onClick={() => router.back()} variant="link" className="mt-4">Go Back</Button>
            </div>
        );
    }

    const assignedCandidates = allCandidates.filter(c => (test.assignedCandidateIds || []).includes(c.id));
    const totalMarks = test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    return (
        <div className="space-y-6">
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tests
            </Button>
            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                            <CardTitle className="text-3xl">{test.title}</CardTitle>
                            <CardDescription className="mt-2">{test.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                <span>Passing Score: {test.passingScore} / {totalMarks}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{test.timeLimit} minutes</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>List of questions included in this test.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='space-y-4'>
                    {test.questions.map((q, index) => (
                        <div key={q.id} className='p-4 border rounded-lg'>
                            <div className='flex justify-between'>
                                <p className="font-medium">{index + 1}. {q.questionText}</p>
                                <div className='flex items-center gap-2'>
                                    {getQuestionTypeBadge(q.type)}
                                    <Badge variant='outline'>{q.marks} Marks</Badge>
                                </div>
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
                             {(q.type === 'mcq' || q.type === 'image-mcq' || q.type === 'video-mcq') && q.options && (
                                <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                                    {q.options.map((opt, i) => <p key={i}>- {opt}</p>)}
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Assigned Candidates</CardTitle>
                    <CardDescription>Candidates who have been assigned this test.</CardDescription>
                </CardHeader>
                <CardContent>
                   {assignedCandidates.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                        {assignedCandidates.map(c => (
                            <Badge variant="secondary" key={c.id}>{c.name}</Badge>
                        ))}
                    </div>
                   ) : (
                    <p className="text-sm text-muted-foreground">No candidates have been assigned this test yet.</p>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}
