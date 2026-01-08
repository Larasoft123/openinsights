import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Sign In - OpenInsights',
  description: 'Sign in to your OpenInsights account',
};

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
