
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTestsStore } from '@/lib/store';
import { PlusCircle, MoreHorizontal, Eye, Pencil, Trash2, Image as ImageIcon, Video, Mic, Type, Search, Puzzle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import { collectionGroup, onSnapshot, query, collection, doc } from 'firebase/firestore';
import type { Question, Test } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function QuestionsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { deleteQuestion, setTests: setLocalTests, tests: localTests } = useTestsStore();
    const [allQuestions, setAllQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isFirebaseEnabled) {
            setAllQuestions(useTestsStore.getState().tests.flatMap(test => (test.questions || []).map(q => ({...q, testTitle: test.title }))) || []);
            setLoading(false);
            return;
        }

        const testsQuery = query(collection(db, 'tests'));
        const testsUnsubscribe = onSnapshot(testsQuery, (snapshot) => {
            const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
            setLocalTests(testsData);

            // Re-map questions with updated test titles if questions are already loaded
            setAllQuestions(prevQuestions => prevQuestions.map(q => {
                const test = testsData.find(t => t.id === q.testId);
                return { ...q, testTitle: test?.title || 'Unknown Test' };
            }));

        }, (error) => {
            console.error("Error fetching tests:", error);
        });

        const questionsQuery = query(collectionGroup(db, 'questions'));
        const questionsUnsubscribe = onSnapshot(questionsQuery, (snapshot) => {
            const currentTests = useTestsStore.getState().tests;
            const questionsData = snapshot.docs.map(docSnap => {
                const data = docSnap.data() as Question;
                const testId = docSnap.ref.parent.parent?.id;
                const test = currentTests.find(t => t.id === testId);
                return {
                    ...data,
                    id: docSnap.id,
                    testId: testId,
                    testTitle: test?.title || 'Unknown Test'
                };
            });
            setAllQuestions(questionsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching questions:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load questions.' });
            setLoading(false);
        });
        
        return () => {
            testsUnsubscribe();
            questionsUnsubscribe();
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setLocalTests, toast]);

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

    const handleDeleteQuestion = (questionId: string, testId?: string) => {
      if (!testId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete question without a test ID.' });
        return;
      }
      deleteQuestion(questionId, testId);
      toast({
        title: 'Question Deleted',
        description: 'The question has been removed from the bank.',
      });
    }

    const filteredQuestions = allQuestions.filter(question =>
        question.questionText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.testTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>Manage your reusable questions for all tests.</CardDescription>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className='relative w-full md:w-64'>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter questions..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => router.push('/dashboard/tests/create')} className='shrink-0'>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Question
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-1/2'>Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Used In</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
            ) : filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => {
                return (
                    <TableRow key={question.id}>
                    <TableCell className="font-medium truncate max-w-sm">{question.questionText}</TableCell>
                    <TableCell>{getQuestionTypeBadge(question.type)}</TableCell>
                    <TableCell>
                        <Link href={`/dashboard/tests/${question.testId}`} className="hover:underline text-muted-foreground hover:text-primary">
                            {question.testTitle}
                        </Link>
                    </TableCell>
                    <TableCell>{question.marks}</TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/tests/${question.testId}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Test
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/questions/${question.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteQuestion(question.id, question.testId)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                );
                })
            ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        {allQuestions.length > 0 ? 'No questions match your search.' : 'No questions found.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
