import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const redirectTo = searchParams.get('redirect_to');

      if (!tokenHash || !type) {
        setStatus('error');
        setError('Invalid verification link');
        return;
      }

      try {
        console.log('[AuthVerify] Verifying email with token_hash...');

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email',
        });

        if (error) throw error;

        console.log('[AuthVerify] ✅ Email verified successfully!');

        // Extract path from full URL if needed
        let redirectPath = redirectTo || '/auth/callback';

        // If redirectTo is a full URL, extract just the pathname
        if (redirectPath.startsWith('http')) {
          try {
            const url = new URL(redirectPath);
            redirectPath = url.pathname + url.search + url.hash;
          } catch {
            redirectPath = '/auth/callback';
          }
        }

        console.log('[AuthVerify] Redirecting to:', redirectPath);

        // Redirect immediately (no success page)
        window.location.href = redirectPath;

      } catch (err: any) {
        console.error('[AuthVerify] Verification error:', err);
        setStatus('error');
        setError(err.message || 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  // Only show error state if verification fails, otherwise blank screen
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full text-center">
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2">Verification failed</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <a href="/auth/signup" className="text-red-500 hover:underline">
              Try signing up again
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Silent bridge - completely blank while verifying and redirecting
  return <div className="min-h-screen bg-background" />;
}
