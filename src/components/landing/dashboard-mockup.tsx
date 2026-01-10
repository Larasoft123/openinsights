'use client';

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { MockSidebar } from './mock-sidebar';
import { MockDashboardPage } from './mock-pages/mock-dashboard';
import { MockProjectsPage } from './mock-pages/mock-projects';
import { MockEvidencePage } from './mock-pages/mock-evidence';
import { MockInsightsPage } from './mock-pages/mock-insights';

/**
 * Dashboard Mockup Component
 *
 * Fully interactive mockup of the real dashboard for the landing page hero.
 * Users can navigate between Dashboard, Projects, Evidence, and Insights pages.
 */
export function DashboardMockup() {
  const [activePage, setActivePage] = useState('dashboard');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  const pageVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  // Render the active page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <MockDashboardPage />;
      case 'projects':
        return <MockProjectsPage />;
      case 'evidence':
        return <MockEvidencePage />;
      case 'insights':
        return <MockInsightsPage />;
      default:
        return <MockDashboardPage />;
    }
  };

  return (
    <motion.div
      className="flex h-full w-full overflow-hidden bg-gray-950"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Mock Sidebar with Navigation */}
      <div className="shrink-0">
        <MockSidebar activePage={activePage} onNavigate={setActivePage} />
      </div>

      {/* Main Content Area */}
      <div className="ml-20 flex flex-1 flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            key={activePage}
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {renderPage()}
          </motion.div>
        </main>
      </div>
    </motion.div>
  );
}
