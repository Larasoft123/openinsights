import { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: 'Shared Research | OpenInsights',
  description: 'View shared research insights',
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Force dark mode for shared pages since light theme is not implemented yet */}
      <div className="dark min-h-screen bg-gray-950">{children}</div>
    </ThemeProvider>
  );
}
