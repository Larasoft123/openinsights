/**
 * Mockup Layout
 *
 * Layout for mockup pages - no authentication required.
 * These pages are used to generate screenshots for documentation.
 */

export default function MockupLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background min-h-screen">{children}</div>;
}
