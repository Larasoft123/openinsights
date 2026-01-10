import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

/**
 * Dashboard App Layout
 *
 * New layout structure with:
 * - Fixed sidebar navigation (64-80px)
 * - Header with workspace switcher
 * - Main content area with responsive padding
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base text-text-primary flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="ml-16 flex flex-1 flex-col overflow-hidden sm:ml-20">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
