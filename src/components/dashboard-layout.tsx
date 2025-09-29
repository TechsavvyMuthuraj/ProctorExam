
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  ChevronDown,
  Library,
  Users,
  Database,
  Shield,
  Settings,
  User,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { isFirebaseEnabled, auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/context/auth-context';
import { useTestsStore, useCandidatesStore, useSubmissionsStore } from '@/lib/store';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import type { Test, Candidate, Submission, Question } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const isActive = (path: string) => pathname.startsWith(path);

  const { setTests } = useTestsStore();
  const { setCandidates } = useCandidatesStore();
  const { setSubmissions } = useSubmissionsStore();

  React.useEffect(() => {
    if (!isFirebaseEnabled) {
      return;
    }

    const unsubscribes: (() => void)[] = [];

    const testsQuery = query(collection(db, 'tests'));
    const testsUnsub = onSnapshot(testsQuery, async (snapshot) => {
        const testsData = await Promise.all(snapshot.docs.map(async (doc) => {
            const test = { id: doc.id, ...doc.data() } as Test;
            const questionsQuery = query(collection(db, 'tests', doc.id, 'questions'));
            const questionsSnapshot = await getDocs(questionsQuery);
            test.questions = questionsSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() } as Question));
            return test;
        }));
        setTests(testsData);
    }, (error) => {
        console.error("Error fetching tests:", error);
        toast({ variant: 'destructive', title: 'Error loading tests', description: error.message });
    });
    unsubscribes.push(testsUnsub);

    const candidatesQuery = query(collection(db, 'candidates'));
    const candidatesUnsub = onSnapshot(candidatesQuery, (snapshot) => {
        const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
        setCandidates(candidatesData);
    }, (error) => {
        console.error("Error fetching candidates:", error);
        toast({ variant: 'destructive', title: 'Error loading candidates', description: error.message });
    });
    unsubscribes.push(candidatesUnsub);

    const submissionsQuery = query(collection(db, 'submissions'));
    const submissionsUnsub = onSnapshot(submissionsQuery, (snapshot) => {
        const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
        setSubmissions(subsData);
    }, (error) => {
        console.error("Error fetching submissions:", error);
        toast({ variant: 'destructive', title: 'Error loading submissions', description: error.message });
    });
    unsubscribes.push(submissionsUnsub);

    return () => unsubscribes.forEach(unsub => unsub());

  }, [setTests, setCandidates, setSubmissions, toast]);

  const handleLogout = async () => {
    if (isFirebaseEnabled) {
      await signOut(auth);
    }
    router.push('/');
  };
  
  const displayName = user?.displayName || user?.email || 'Admin';
  const displayEmail = user?.email || 'No email associated';

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
           <div className="flex items-center gap-2 font-bold text-xl">
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                <Shield className="h-5 w-5 text-primary" />
            </div>
            <span>ProctorExam Lite</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                <Link href="/dashboard">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarGroup>
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/tests')}>
                  <Link href="/dashboard/tests">
                    <FileText />
                    Tests
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/questions')}>
                  <Link href="/dashboard/questions">
                    <Library />
                    Question Bank
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
           <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/candidates')}>
                  <Link href="/dashboard/candidates">
                    <Users />
                    Candidates
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/analysis')}>
                  <Link href="/dashboard/analysis">
                    <ShieldAlert />
                    Analysis
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/results')}>
                  <Link href="/dashboard/results">
                    <Check />
                    Results
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/settings')}>
                  <Link href="/dashboard/settings">
                    <Settings />
                    Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/dashboard/seed-database')}>
                        <Link href="/dashboard/seed-database">
                        <Database />
                        Seed Database
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-background/50 px-4 backdrop-blur-sm md:justify-end">
          <SidebarTrigger className="md:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-muted">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {user ? <User className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
