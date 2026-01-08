import { Header } from '@/components/layout/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
