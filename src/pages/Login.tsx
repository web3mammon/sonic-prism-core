import { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { user, signIn, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [fetchingClient, setFetchingClient] = useState(true);
  const [noClientError, setNoClientError] = useState(false);

  // Fetch client data when user is authenticated
  useEffect(() => {
    async function fetchClientData() {
      if (!user?.id) {
        setFetchingClient(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('voice_ai_clients')
          .select('region, industry, business_name, status')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('[Login] Error fetching client:', error);
          setClientData(null);
          setNoClientError(true);
        } else if (data) {
          console.log('[Login] Found client:', data);
          setClientData(data);
          setNoClientError(false);
        } else {
          console.log('[Login] No client found for user:', user.id);
          setClientData(null);
          setNoClientError(true);
        }
      } catch (error) {
        console.error('[Login] Exception fetching client:', error);
        setClientData(null);
      } finally {
        setFetchingClient(false);
      }
    }

    fetchClientData();
  }, [user?.id]);

  // Show loading while checking for client
  if (user && profile && fetchingClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if already authenticated AND has client
  if (user && profile && !fetchingClient && clientData) {
    const dashboardUrl = `/${clientData.region.toLowerCase()}/${clientData.industry}/${clientData.business_name.toLowerCase()}`;
    console.log('[Login] Redirecting to dashboard:', dashboardUrl);
    return <Navigate to={dashboardUrl} replace />;
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
            src="/assets/images/klariqo-white.svg"
            alt="Klariqo"
            className="h-8"
          />
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center pb-8">
          <h2 className="text-4xl font-light mb-2">Welcome Back</h2>
          <p className="text-base text-[#a0a0a0]">
            Sign in to your Klariqo account
          </p>
        </div>

        <div>
          {/* Show error only if logged in but no client */}
          {user && profile && !fetchingClient && noClientError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <p className="font-medium">Setup incomplete</p>
              <p className="text-xs mt-1">Please <a href="/onboarding" className="underline font-medium">complete your setup</a> to access the dashboard.</p>
            </div>
          )}

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
                className="w-full text-[#a0a0a0] hover:text-white"
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
                    className="text-sm text-[#a0a0a0] hover:text-white transition-colors"
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
              <div className="pt-4 border-t border-[rgba(255,255,255,0.12)]">
                <Link
                  to="/onboarding"
                  className="group flex items-center justify-center gap-2 text-sm text-[#a0a0a0] hover:text-white transition-colors font-light"
                >
                  <span>New to Klariqo? <span className="font-medium">Start here</span></span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
