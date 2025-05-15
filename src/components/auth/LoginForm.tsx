
"use client";
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Chrome } from 'lucide-react'; // Using Chrome as a generic Google icon
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export function LoginForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await signInWithEmail(email, password);
    if (!result) {
      toast({
        title: "Sign In Failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await signUpWithEmail(email, password);
     if (!result) {
      toast({
        title: "Sign Up Failed",
        description: "Could not create account. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    // No toast here as redirect handles success/failure implicitly or AuthProvider shows global error
    setIsSubmitting(false);
  }
  
  const currentLoading = authLoading || isSubmitting;

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">ProAssistant</CardTitle>
        <CardDescription>Sign in or create an account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleEmailSignIn} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email-signin">Email</Label>
                <Input id="email-signin" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" disabled={currentLoading} />
              </div>
              <div>
                <Label htmlFor="password-signin">Password</Label>
                <Input id="password-signin" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" disabled={currentLoading} />
              </div>
              <Button type="submit" className="w-full" disabled={currentLoading}>
                {currentLoading && <Spinner className="mr-2" size="small" />}
                Sign In
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email-signup">Email</Label>
                <Input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" disabled={currentLoading} />
              </div>
              <div>
                <Label htmlFor="password-signup">Password</Label>
                <Input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a password" disabled={currentLoading} />
              </div>
              <Button type="submit" className="w-full" disabled={currentLoading}>
                {currentLoading && <Spinner className="mr-2" size="small" />}
                Sign Up
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={currentLoading}>
          {currentLoading ? <Spinner className="mr-2" size="small" /> : <Chrome className="mr-2 h-4 w-4" /> }
          Google
        </Button>
      </CardFooter>
    </Card>
  );
}

//git
