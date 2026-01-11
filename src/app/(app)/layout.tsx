import { Sidebar } from '@/components/dashboard/sidebar';

/**
 * Dashboard App Layout
 *
 * New layout structure with:
 * - Fixed sidebar navigation (80px)
 * - Main content area with responsive padding
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div className="ml-20 flex flex-1 flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
