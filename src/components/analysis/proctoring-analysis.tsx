'use client';

import { useState, useTransition, useEffect } from 'react';
import { Bot, User, Clock, AlertTriangle, FileText, Loader2, Sparkles, Link2 } from 'lucide-react';
import type { AnalyzeProctoringLogsOutput } from '@/ai/flows/analyze-proctoring-logs';
import { getAnalysis } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Candidate, Test, ProctoringLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ProctoringAnalysisProps = {
  candidate: Candidate;
  test: Test;
  logs: ProctoringLog[];
};

export function ProctoringAnalysis({ candidate, test, logs }: ProctoringAnalysisProps) {
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<AnalyzeProctoringLogsOutput | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Reset analysis when props change
    setAnalysisResult(null);
  }, [candidate, test, logs]);

  const handleAnalysis = () => {
    startTransition(async () => {
      const result = await getAnalysis(logs);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: result.error,
        });
        setAnalysisResult(null);
      } else {
        setAnalysisResult(result.data!);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="secondary">Present</Badge>;
      case 'no_face':
        return <Badge variant="outline" className="border-accent text-accent-foreground">No Face</Badge>;
      case 'multiple_faces':
        return <Badge variant="destructive">Multiple Faces</Badge>;
      case 'tab_switch':
        return <Badge variant="destructive" className="bg-yellow-500 text-white"><Link2 className='w-3 h-3 mr-1'/>Tab Switch</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Logs for the selected test session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-4">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Candidate</span>
                    <span className="font-medium">{candidate.name}</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Test</span>
                    <span className="font-medium">{test.title}</span>
                </div>
             </div>
            <Button onClick={handleAnalysis} disabled={isPending || logs.length === 0} className="w-full">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze with AI
            </Button>
            <ScrollArea className="h-96 w-full rounded-md border p-2">
              <div className="p-2">
                <h4 className="mb-4 text-sm font-medium leading-none">Proctoring Logs ({logs.length})</h4>
                {logs.length > 0 ? logs.map(log => (
                  <div key={log.id} className="mb-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {isClient ? <span>{format(new Date(log.timestamp), 'HH:mm:ss')}</span> : null}
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                )) : (
                  <p className="text-center text-sm text-muted-foreground py-16">No proctoring logs found for this session.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="min-h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>AI Analysis Report</CardTitle>
                <CardDescription>Suspicious activities identified by AI.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isPending && (
              <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-medium">Analyzing logs...</p>
                <p className="text-sm text-muted-foreground">The AI is reviewing the session for potential issues. Please wait.</p>
              </div>
            )}
            {!isPending && !analysisResult && (
              <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Ready to Analyze</p>
                <p className="text-sm text-muted-foreground">Click the "Analyze with AI" button to generate a report.</p>
              </div>
            )}
            {analysisResult && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Summary</h3>
                  <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                </div>
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Flagged Activities</h3>
                  {analysisResult.suspiciousActivities.length > 0 ? (
                    <div className="space-y-4">
                      {analysisResult.suspiciousActivities.map((activity, index) => (
                        <div key={index} className="rounded-lg border bg-card p-4">
                           <div className="flex items-start gap-3">
                              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{activity.reason}</p>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <p className="font-medium">Timestamps:</p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                  {activity.timestamps.map((ts, i) => (
                                    <Badge key={i} variant="secondary">
                                      {isClient ? format(new Date(ts), 'HH:mm:ss') : ''}
                                    </Badge>
                                  ))}
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No suspicious activities were detected.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
