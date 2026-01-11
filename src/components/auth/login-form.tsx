'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertMessage } from '@/components/ui/alert-message';
import { OAuthButton } from '@/components/auth/oauth-button';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  // Show loading while checking auth status
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="border-accent-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: 'google' | 'github') => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with branding */}
      <div className="text-center">
        <Link href="/" className="mb-4 inline-block">
          <Image
            src="/nin-logo.png"
            alt="OpenInsights"
            width={180}
            height={32}
            className="mx-auto invert"
          />
        </Link>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-400">Sign in to your account to continue</p>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <OAuthButton
          provider="google"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isLoading}
        />
        <OAuthButton
          provider="github"
          onClick={() => handleOAuthSignIn('github')}
          disabled={isLoading}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-gray-500" style={{ backgroundColor: '#18181B' }}>
            Or continue with
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || formError) && (
          <AlertMessage
            variant="error"
            message={formError || 'Authentication failed. Please try again.'}
          />
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-text-primary text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="text-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-text-primary text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="text-white"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="text-text-secondary text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-accent-primary hover:text-accent-hover hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
