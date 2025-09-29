
'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';

export default function TestLayout({ children }: { children: React.ReactNode }) {
  
  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40 overflow-x-hidden">
        <header className="flex h-16 items-center border-b bg-background/50 px-4 md:px-6 shrink-0">
            <Link href="/" className="flex items-center gap-2 font-semibold">
                 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <span>ProctorExam Lite</span>
            </Link>
        </header>
        <main className="flex flex-1 w-full items-start justify-center p-4">
            {children}
        </main>
    </div>
  );
}
