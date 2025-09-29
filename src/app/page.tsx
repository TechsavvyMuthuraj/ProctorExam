
'use client';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <header className="relative py-4 container mx-auto">
         <nav className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <span>ProctorExam Lite</span>
            </Link>
             <div className="flex items-center gap-2">
                 <ThemeSwitcher />
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/login?portal=true" aria-label="Admin/Evaluator Login">
                        <LogIn />
                    </Link>
                </Button>
             </div>
         </nav>
      </header>
      
      <main className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            The Modern Platform for <br/> Technical Assessments
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
           Create, assign, and evaluate coding tests with a secure, AI-powered proctoring solution.
        </p>
        <div className="mt-8">
            <Button size="lg" asChild>
                <Link href="/login">Candidate Registration</Link>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">✓ Secure & Reliable</p>
        </div>
      </main>

       <section className="bg-muted/50 py-16">
           <div className="container mx-auto text-center">
               <h2 className="text-2xl font-semibold">Here to take a test?</h2>
               <p className="text-muted-foreground mt-2">No registration required if you have already signed up. Just enter your access code.</p>
               <div className="mt-6 max-w-md mx-auto">
                  <Button size="lg" className="w-full" onClick={() => router.push('/test/access')}>
                    Take a Test
                  </Button>
               </div>
           </div>
       </section>

       <footer className="py-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ProctorExam Lite. All rights reserved.</p>
        </footer>
    </div>
  );
}
