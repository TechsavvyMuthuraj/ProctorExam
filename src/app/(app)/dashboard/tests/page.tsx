

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
import { PlusCircle, MoreHorizontal, Copy, Trash2, Pencil, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useTestsStore, useSubmissionsStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseEnabled } from '@/lib/firebase';
import type { Test } from '@/lib/types';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function TestsPage() {
  const router = useRouter();
  const { tests, deleteTest } = useTestsStore();
  const { submissions } = useSubmissionsStore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Data now comes from the global store, which is populated by the layout.
    // We just need to wait for it to be non-empty if using Firebase.
    if (tests.length > 0 || !isFirebaseEnabled) {
      setLoading(false);
    }
  }, [tests]);

  const handleDelete = async () => {
    if (!testToDelete) return;
    
    try {
        await deleteTest(testToDelete.id);
        toast({ title: 'Test Deleted', description: 'The test has been removed.' });
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete test.' });
    } finally {
        setTestToDelete(null);
    }
  }

  const copyAccessCode = (code: string | undefined) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Access code copied to clipboard.',
    });
  };

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <AlertDialog open={!!testToDelete} onOpenChange={(open) => !open && setTestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test "{testToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
              <CardTitle>Tests</CardTitle>
              <CardDescription>Create, manage, and assign tests to candidates.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className='relative w-full md:w-64'>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter tests..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className='shrink-0' onClick={() => router.push('/dashboard/tests/create')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Title</TableHead>
                <TableHead>Access Code</TableHead>
                <TableHead>Candidates</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className='sr-only'>Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTests.map((test) => {
                  const assignedCount = (test.assignedCandidateIds || []).length;
                  const submissionCount = submissions.filter(s => s.testId === test.id).length;
                  const isPublished = new Date(test.createdAt) < new Date();
                return (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{test.accessCode}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyAccessCode(test.accessCode)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{assignedCount}</TableCell>
                    <TableCell>{submissionCount}</TableCell>
                    <TableCell>
                      <Badge variant={isPublished ? 'secondary' : 'outline'}>
                        {isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/tests/${test.id}`)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/tests/${test.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/tests/${test.id}/assign`)}>Assign Candidates</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/tests/${test.id}/submissions`)}>View Submissions</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTestToDelete(test)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filteredTests.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        {tests.length > 0 ? 'No tests match your search.' : 'No tests found. Create one to get started.'}
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
