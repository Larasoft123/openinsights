import Link from 'next/link';

export default function ShareNotFound() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-foreground mb-4 text-4xl font-bold">Link Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This share link is invalid, expired, or has been revoked.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          Go to OpenInsights
        </Link>
      </div>
    </div>
  );
}
