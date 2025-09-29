
'use client';

import { useState } from 'react';
import { useTestsStore, useSubmissionsStore, useCandidatesStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, CheckCircle, XCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function ResultsPage() {
    const { tests } = useTestsStore();
    const { submissions } = useSubmissionsStore();
    const { candidates } = useCandidatesStore();

    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const getResultBadge = (result?: 'pass' | 'fail') => {
        if (result === 'pass') {
            return <Badge variant="secondary" className="bg-green-500/20 text-green-700 hover:bg-green-500/30"><CheckCircle className='mr-1 h-3 w-3'/>Pass</Badge>
        }
        if (result === 'fail') {
            return <Badge variant="destructive"><XCircle className='mr-1 h-3 w-3'/>Fail</Badge>
        }
        return <span className="text-muted-foreground">-</span>;
    }

    const selectedTest = tests.find(t => t.id === selectedTestId);
    const totalMarks = selectedTest?.questions.reduce((acc, q) => acc + (q.marks || 0), 0) || 0;

    const filterCandidatesBySearch = (submissionsList: any[]) => {
        return submissionsList.map(submission => {
            const candidate = candidates.find(c => c.id === submission.candidateId);
            return { submission, candidate };
        }).filter(({ candidate }) => {
            if (!candidate) return false;
            if (searchTerm === '') return true;
            return candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
        });
    };

    const passedSubmissions = selectedTestId 
        ? submissions.filter(s => s.testId === selectedTestId && s.result === 'pass')
        : [];
    const failedSubmissions = selectedTestId
        ? submissions.filter(s => s.testId === selectedTestId && s.result === 'fail')
        : [];

    const filteredPassedCandidates = filterCandidatesBySearch(passedSubmissions);
    const filteredFailedCandidates = filterCandidatesBySearch(failedSubmissions);


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Test Results</CardTitle>
                    <CardDescription>View candidates who have passed or failed a specific test.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Select a Test</label>
                        <Select onValueChange={setSelectedTestId} value={selectedTestId || ""}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a test to view results..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tests.length === 0 ? <SelectItem value="loading" disabled>Loading...</SelectItem> : tests.map(test => (
                                    <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <label className="text-sm font-medium mb-2 block">Search Candidates</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            placeholder="Filter by name or email..." 
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={!selectedTestId}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedTestId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Passed Candidates</CardTitle>
                            <CardDescription>
                                Candidates who successfully passed "{selectedTest?.title}".
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPassedCandidates.length > 0 ? filteredPassedCandidates.map(({ submission, candidate }) => {
                                        return (
                                            <TableRow key={submission.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={candidate?.avatarUrl} alt={candidate?.name} />
                                                            <AvatarFallback>
                                                                <User className="h-5 w-5 text-muted-foreground" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{candidate?.name}</p>
                                                            <p className="text-sm text-muted-foreground">{candidate?.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='font-medium'>{submission.score} / {totalMarks}</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">
                                                {passedSubmissions.length > 0 ? 'No candidates match your search.' : 'No candidates have passed this test yet.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Failed Candidates</CardTitle>
                             <CardDescription>
                                Candidates who did not pass "{selectedTest?.title}".
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFailedCandidates.length > 0 ? filteredFailedCandidates.map(({ submission, candidate }) => {
                                        return (
                                            <TableRow key={submission.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={candidate?.avatarUrl} alt={candidate?.name} />
                                                            <AvatarFallback>
                                                                <User className="h-5 w-5 text-muted-foreground" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{candidate?.name}</p>
                                                            <p className="text-sm text-muted-foreground">{candidate?.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='font-medium'>{submission.score} / {totalMarks}</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">
                                                 {failedSubmissions.length > 0 ? 'No candidates match your search.' : 'No candidates have failed this test.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
