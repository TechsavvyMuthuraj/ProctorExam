
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Webcam, Mic, Wifi, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CheckStatus = 'pending' | 'success' | 'error';

interface PreFlightChecksProps {
  onChecksComplete: (success: boolean) => void;
}

export function PreFlightChecks({ onChecksComplete }: PreFlightChecksProps) {
  const { toast } = useToast();
  const [webcamStatus, setWebcamStatus] = useState<CheckStatus>('pending');
  const [micStatus, setMicStatus] = useState<CheckStatus>('pending');
  const [internetStatus, setInternetStatus] = useState<CheckStatus>('pending');

  const runChecks = async () => {
    // Check Webcam and Mic
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // We got the permissions, now we can stop the tracks immediately.
      // The test page will request them again when it starts.
      mediaStream.getTracks().forEach(track => track.stop());
      setWebcamStatus('success');
      setMicStatus('success');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setWebcamStatus('error');
      setMicStatus('error');
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Please enable camera and microphone permissions to proceed.',
      });
    }

    // Check Internet (simple online check)
    if (navigator.onLine) {
      setInternetStatus('success');
    } else {
      setInternetStatus('error');
    }
  };
  
  useEffect(() => {
    if (webcamStatus === 'success' && micStatus === 'success' && internetStatus === 'success') {
      onChecksComplete(true);
    } else if (webcamStatus === 'error' || micStatus === 'error' || internetStatus === 'error') {
       onChecksComplete(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamStatus, micStatus, internetStatus]);

  const getStatusIcon = (status: CheckStatus) => {
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'error') return <XCircle className="h-5 w-5 text-destructive" />;
    return <div className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground animate-spin" />;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Webcam className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Webcam</span>
          </div>
          {getStatusIcon(webcamStatus)}
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Microphone</span>
          </div>
          {getStatusIcon(micStatus)}
        </div>
         <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Internet Connection</span>
          </div>
          {getStatusIcon(internetStatus)}
        </div>
      </div>
      
      {(webcamStatus === 'error' || micStatus === 'error') && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className='h-4 w-4'/>
            <p>Please grant camera and mic permissions and try again.</p>
        </div>
      )}

      <div className="text-center">
        <Button onClick={runChecks} disabled={webcamStatus !== 'pending'}>
          Run System Check
        </Button>
      </div>
    </div>
  );
}
