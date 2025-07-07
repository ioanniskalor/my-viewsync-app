import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function AnalyticsPage({ params }: { params: { videoId: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8 md:p-12">
      <header className="w-full max-w-6xl mb-8 flex justify-between items-center">
        <Logo />
        <Button asChild variant="outline" className="hidden sm:flex">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Upload Another Video
          </Link>
        </Button>
      </header>
      <AnalyticsDashboard videoId={params.videoId} />
    </main>
  );
}
