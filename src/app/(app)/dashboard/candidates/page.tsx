
'use client';
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCandidatesStore, useTestsStore } from '@/lib/store';
import { isFirebaseEnabled, db } from '@/lib/firebase';
import {
  doc,
  deleteDoc,
} from 'firebase/firestore';
import type { Candidate, Test } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, User, Search, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CandidatesPage() {
  const { candidates, removeCandidate } = useCandidatesStore();
  const { tests, assignCandidates } = useTestsStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [candidateToAssign, setCandidateToAssign] = useState<Candidate | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Loading is now primarily handled by the layout
    if(candidates.length > 0 || !isFirebaseEnabled) {
      setLoading(false);
    }
  }, [candidates]);


  const getAssignedTestsCount = (candidateId: string) => {
    return tests.filter((test) =>
      (test.assignedCandidateIds || []).includes(candidateId)
    ).length;
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;

    try {
      await removeCandidate(candidateToDelete.id);
      toast({ title: 'Candidate Removed', description: `${candidateToDelete.name} has been removed from the system.` });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete candidate.' });
    } finally {
      setCandidateToDelete(null);
    }
  };

  const handleAssignTest = async () => {
    if (!candidateToAssign || !selectedTestId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a test to assign.'});
        return;
    }

    try {
        await assignCandidates(selectedTestId, [candidateToAssign.id]);
        toast({ title: 'Test Assigned', description: `Successfully assigned test to ${candidateToAssign.name}.` });
    } catch (error) {
        console.error("Error assigning test:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign the test.' });
    } finally {
        setCandidateToAssign(null);
        setSelectedTestId('');
    }
  }
  
  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableTestsForAssignment = candidateToAssign ? tests.filter(test => !test.assignedCandidateIds?.includes(candidateToAssign.id)) : [];

  return (
    <>
    <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the candidate record for <strong>{candidateToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCandidate} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <Dialog open={!!candidateToAssign} onOpenChange={(open) => { if (!open) { setCandidateToAssign(null); setSelectedTestId(''); } }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Test to {candidateToAssign?.name}</DialogTitle>
                <DialogDescription>Select a test from the list below to assign it to this candidate.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select onValueChange={setSelectedTestId} value={selectedTestId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a test..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableTestsForAssignment.length > 0 ? (
                            availableTestsForAssignment.map(test => (
                                <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>No unassigned tests available</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCandidateToAssign(null)}>Cancel</Button>
                <Button onClick={handleAssignTest} disabled={!selectedTestId}>Assign Test</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              A list of all registered candidates in the system.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by name or email..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned Tests</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32 mt-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                        <AvatarFallback>
                          <User className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {candidate.mobileNumber || '-'}
                  </TableCell>
                  <TableCell>{getAssignedTestsCount(candidate.id)}</TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setCandidateToAssign(candidate)}>
                           <FilePlus className="mr-2 h-4 w-4" />
                           Assign Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCandidateToDelete(candidate)} className="text-destructive">
                           <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredCandidates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                     {candidates.length > 0 ? 'No candidates match your search.' : 'No candidates found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
