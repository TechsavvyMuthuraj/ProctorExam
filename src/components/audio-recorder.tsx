'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Pause, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  onRecordingComplete: (audioDataUrl: string) => void;
  initialAudio?: string;
}

export function AudioRecorder({ onRecordingComplete, initialAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(initialAudio || null);
  const [isClient, setIsClient] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onRecordingComplete(base64data);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Microphone access denied',
        description: 'Please allow microphone access in your browser settings.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop microphone tracks
      if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRecordButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setAudioURL(null); // Clear previous recording if any
      startRecording();
    }
  };

  const handleDeleteAudio = () => {
    setAudioURL(null);
    onRecordingComplete('');
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {audioURL ? (
        <div className="flex items-center gap-4">
          <audio controls src={audioURL} className="w-full">
            Your browser does not support the audio element.
          </audio>
          <Button variant="outline" size="icon" onClick={handleDeleteAudio}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Button onClick={handleRecordButtonClick} size="lg" className="rounded-full h-16 w-16">
                {isRecording ? <Pause className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <div className='space-y-1'>
                <p className="text-sm font-medium">{isRecording ? 'Recording...' : 'Record your answer'}</p>
                 <p className="text-sm text-muted-foreground">{formatTime(recordingTime)}</p>
            </div>
        </div>
      )}
    </div>
  );
}
