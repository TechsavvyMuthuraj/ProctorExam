'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db, isFirebaseEnabled } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { tests as initialTests, candidates as initialCandidates, proctoringLogs as initialProctoringLogs } from '@/lib/data';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function SeedDatabasePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSeedDatabase = async () => {
    if (!isFirebaseEnabled) {
      toast({
        variant: 'destructive',
        title: 'Firebase Not Configured',
        description: 'Please configure your Firebase credentials in .env.local to seed the database.',
      });
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const batch = writeBatch(db);

      // Seed tests and their sub-collection of questions
      initialTests.forEach(test => {
        const { questions, ...testData } = test;
        const testRef = doc(db, 'tests', test.id);
        batch.set(testRef, testData);

        questions.forEach(question => {
          const questionRef = doc(db, 'tests', test.id, 'questions', question.id);
          batch.set(questionRef, question);
        });
      });

      // Seed candidates
      initialCandidates.forEach(candidate => {
        const candidateRef = doc(db, 'candidates', candidate.id);
        batch.set(candidateRef, candidate);
      });
      
      // Seed proctoring logs
      initialProctoringLogs.forEach(log => {
        const logRef = doc(db, 'proctoringLogs', log.id);
        batch.set(logRef, log);
      });


      await batch.commit();

      toast({
        title: 'Database Seeded Successfully!',
        description: 'Your Firestore database has been populated with sample data.',
      });
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error seeding database:', error);
      toast({
        variant: 'destructive',
        title: 'Database Seeding Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seed Firestore Database</CardTitle>
          <CardDescription>
            Click the button below to automatically populate your Firestore database with the initial sample data for tests, candidates, and proctoring logs. This is useful for setting up your development environment quickly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {!isFirebaseEnabled ? (
             <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <p className='text-sm font-medium'>Firebase is not configured. Please add your credentials to `.env.local`.</p>
             </div>
          ) : isSuccess ? (
             <div className="p-4 rounded-md bg-green-500/10 text-green-700 flex items-center justify-center gap-3">
                <CheckCircle className="h-5 w-5" />
                <p className='text-sm font-medium'>Database seeded successfully!</p>
             </div>
          ) : (
            <Button onClick={handleSeedDatabase} disabled={isLoading}>
                {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding...</>
                ) : (
                    'Seed Database Now'
                )}
            </Button>
          )}

          <div className="text-left text-sm text-muted-foreground bg-muted p-4 rounded-md">
            <h4 className='font-medium text-foreground mb-2'>What will be added?</h4>
            <ul className='list-disc pl-5 space-y-1'>
                <li><span className='font-semibold'>{initialTests.length} tests</span> into the `tests` collection.</li>
                <li>The questions for each test will be added to a `questions` subcollection within each test document.</li>
                <li><span className='font-semibold'>{initialCandidates.length} candidates</span> into the `candidates` collection.</li>
                <li><span className='font-semibold'>{initialProctoringLogs.length} proctoring logs</span> into the `proctoringLogs` collection.</li>
            </ul>
            <p className='mt-3'>Note: Running this multiple times will overwrite existing documents with the same ID.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
