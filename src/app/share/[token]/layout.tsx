import { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: 'Shared Research | OpenInsights',
  description: 'View shared research insights',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="bg-background min-h-screen">{children}</div>
    </ThemeProvider>
  );
}
