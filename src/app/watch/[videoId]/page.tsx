import { VideoPlayer } from '@/components/video-player';
import { Logo } from '@/components/logo';

export default function WatchPage({ params }: { params: { videoId: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <header className="w-full max-w-5xl mb-8">
        <Logo />
      </header>
      <VideoPlayer videoId={params.videoId} />
    </main>
  );
}
