import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: 'Sign Up - OpenInsights',
  description: 'Create your OpenInsights account',
};

export default function RegisterPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <RegisterForm />
    </div>
  );
}
