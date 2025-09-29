
'use client';

import { useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, LogIn, User, Mail, Shield, UserCheck, KeyRound, CheckCircle, ArrowRight, ArrowLeft, Camera, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCandidatesStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, isFirebaseEnabled, signInAsCandidate } from '@/lib/firebase';
import { collection, setDoc, doc, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { addCandidate, candidates: localCandidates } = useCandidatesStore();
    
    const isPortalLogin = searchParams.get('portal') === 'true';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);

    const [evaluatorEmail, setEvaluatorEmail] = useState('');
    const [evaluatorPassword, setEvaluatorPassword] = useState('');
    const [evaluatorLoading, setEvaluatorLoading] = useState(false);


    const handleAdminLogin = async () => {
        if (!adminEmail || !adminPassword) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter both email and password.'});
            return;
        }
        setAdminLoading(true);
        if (!isFirebaseEnabled) {
             toast({ title: 'Welcome back!' });
             router.push('/dashboard');
             return;
        }
        try {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            toast({ title: 'Welcome back!' });
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Admin login error:', error);
            let description = 'An unexpected error occurred.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                description = 'Invalid email or password. Please check your credentials or create an account in the Firebase console.';
            } else {
                description = error.message;
            }
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: description
            });
        } finally {
            setAdminLoading(false);
        }
    }

    const handleEvaluatorLogin = async () => {
        if (!evaluatorEmail || !evaluatorPassword) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter both email and password.'});
            return;
        }
        setEvaluatorLoading(true);
        if (!isFirebaseEnabled) {
            toast({ title: 'Welcome back!' });
            router.push('/evaluator');
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, evaluatorEmail, evaluatorPassword);
            toast({ title: 'Welcome back!' });
            router.push('/evaluator');
        } catch (error: any) {
            console.error('Evaluator login error:', error);
             let description = 'An unexpected error occurred.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                description = 'Invalid email or password. Please check your credentials or create an account in the Firebase console.';
            } else {
                description = error.message;
            }
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: description
            });
        } finally {
            setEvaluatorLoading(false);
        }
    }

    const handleCandidateRegistration = async () => {
        if (!name || !email) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill in your name and email.'
            });
            return;
        }
        
        setCandidateLoading(true);

        try {
            const avatarUrl = ''; // Use fallback icon instead of a generated image

            if (isFirebaseEnabled) {
                 const candidatesRef = collection(db, "candidates");
                 const q = query(candidatesRef, where("email", "==", email.toLowerCase()), limit(1));
                 const querySnapshot = await getDocs(q);

                 if (!querySnapshot.empty) {
                     toast({
                         variant: 'destructive',
                         title: 'Already Registered',
                         description: 'This email address is already registered. Please proceed to take a test.'
                     });
                     setCandidateLoading(false);
                     return;
                 }

                const user = await signInAsCandidate();
                if (!user) throw new Error("Could not create anonymous user.");

                const candidateRef = doc(db, "candidates", user.uid);
                await setDoc(candidateRef, {
                    id: user.uid,
                    name,
                    email,
                    avatarUrl,
                    mobileNumber,
                }, { merge: true });

            } else {
                const existingCandidate = localCandidates.find(c => c.email.toLowerCase() === email.toLowerCase());
                if (existingCandidate) {
                     toast({
                         variant: 'destructive',
                         title: 'Already Registered',
                         description: 'This email address is already registered. Please proceed to take a test.'
                     });
                     setCandidateLoading(false);
                     return;
                }
                const newCandidateId = `cand-${Date.now()}`;
                const candidate = {
                    id: newCandidateId,
                    name,
                    email,
                    avatarUrl,
                    mobileNumber,
                };
                addCandidate(candidate);
            }

            setRegistrationSuccess(true);

        } catch (error: any) {
             console.error('Candidate registration error:', error);
            toast({
                variant: 'destructive',
                title: 'Registration Failed',
                description: error.message || 'An unexpected error occurred.'
            });
        } finally {
            setCandidateLoading(false);
        }
    }
    
    const glassmorphismClass = "bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-border/20";


    if (isPortalLogin) {
        return (
            <Card className={`w-full max-w-md ${glassmorphismClass}`}>
                 <CardHeader className="text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">ProctorExam Lite Portal</CardTitle>
                    <CardDescription>
                    Admin & Evaluator Login
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="admin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="admin"><Shield className="mr-2 h-4 w-4" />Admin</TabsTrigger>
                            <TabsTrigger value="evaluator"><UserCheck className="mr-2 h-4 w-4" />Evaluator</TabsTrigger>
                        </TabsList>
                        <TabsContent value="admin" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Admin Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="admin-email"
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="admin@proctor.com"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-password">Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="admin-password"
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleAdminLogin} className="w-full" disabled={adminLoading}>
                                <LogIn className="mr-2" />
                                {adminLoading ? 'Logging in...' : 'Login as Admin'}
                            </Button>
                        </TabsContent>
                        <TabsContent value="evaluator" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="evaluator-email">Evaluator Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="evaluator-email"
                                        type="email"
                                        value={evaluatorEmail}
                                        onChange={(e) => setEvaluatorEmail(e.target.value)}
                                        placeholder="evaluator@proctor.com"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="evaluator-password">Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="evaluator-password"
                                        type="password"
                                        value={evaluatorPassword}
                                        onChange={(e) => setEvaluatorPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleEvaluatorLogin} className="w-full" disabled={evaluatorLoading}>
                                <LogIn className="mr-2" />
                                {evaluatorLoading ? 'Logging in...' : 'Login as Evaluator'}
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        )
    }

  return (
        <Card className={`w-full max-w-lg ${glassmorphismClass}`}>
            <CardHeader className="text-center">
                 <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle>Candidate Registration</CardTitle>
                <CardDescription>First time here? Register with your details to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                {registrationSuccess ? (
                    <div className="text-center space-y-4 animate-in fade-in-50">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-semibold">Registration Successful!</h3>
                        <p className="text-muted-foreground">You can now proceed to take a test using an access code.</p>
                        <div className="flex flex-col gap-2">
                            <Button asChild className="w-full">
                               <Link href="/test/access">
                                 Proceed to Test <ArrowRight className="ml-2" />
                               </Link>
                            </Button>
                             <Button variant="outline" onClick={() => setRegistrationSuccess(false)}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Registration
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <div className="flex flex-col items-center space-y-4">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback>
                                    <User className="h-12 w-12 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., John Doe"
                                    className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="e.g., john.doe@example.com"
                                    className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                id="mobile"
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                placeholder="e.g., +1 234 567 890"
                                className="pl-9"
                                />
                            </div>
                        </div>

                        <Button onClick={handleCandidateRegistration} className="w-full" disabled={candidateLoading || !name || !email}>
                            <LogIn className="mr-2" />
                            {candidateLoading ? 'Registering...' : 'Register'}
                        </Button>
                         <p className="text-center text-sm text-muted-foreground pt-2">
                            Already registered? <Link href="/test/access" className='font-medium text-primary hover:underline'>Take a test</Link>.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
