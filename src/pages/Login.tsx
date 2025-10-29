import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

export default function Login() {
  const { user, signIn, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  // Redirect if already authenticated
  if (user && profile) {
    const extendedProfile = profile as any;

    // If business setup not complete, redirect to onboarding
    if (!extendedProfile.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }

    // If setup is complete, redirect to dashboard
    // TODO: Get actual dashboard URL from profile/client data
    const from = location.state?.from?.pathname || '/au/plmb/acmeplumbing';
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    await signIn(email, password);
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password reset email sent",
        description: "Check your email for a password reset link.",
      });
      setResetMode(false);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-manrope relative">
      {/* Solid background */}
      <div className="fixed inset-0 -z-20 bg-background" />

      {/* Subtle dotted background - matches dashboard */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Logo */}
      <div className="absolute top-6 left-6">
        <Link to="/">
          <img
            src="/assets/images/klariqo-logov1-white.png"
            alt="Klariqo"
            className="h-8"
          />
        </Link>
      </div>

      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl font-extralight mb-2">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Sign in to your Klariqo account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {resetMode ? (
            // Forgot Password Form
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? "Sending reset email..." : "Send Reset Email"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setResetMode(false)}
              >
                ← Back to Sign In
              </Button>
            </form>
          ) : (
            // Sign In Form
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* New to Klariqo Link */}
              <div className="pt-4 border-t border-border/50">
                <Link
                  to="/onboarding"
                  className="group flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>New to Klariqo? <span className="font-medium">Start here</span></span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
