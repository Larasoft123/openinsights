import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Sign Up - OpenInsights',
  description: 'Create your OpenInsights account',
};

export default function RegisterPage() {
  return (
    <div
      className="dark relative flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: '#09090B' }}
    >
      {/* Subtle indigo glow - matching landing page */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '600px',
          background:
            'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        }}
      />

      <Card
        className="relative z-10 w-full max-w-md rounded-2xl border-white/10 shadow-lg"
        style={{ backgroundColor: '#18181B' }}
      >
        <CardContent className="p-8 text-white">
          <Suspense
            fallback={
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="border-accent-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
