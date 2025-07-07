
"use client"

import { useEffect, useState, useMemo } from "react";
import { type Video, type WatchData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, BarChart3, Clock, Percent, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";

interface ViewerAnalytics {
  id: string;
  name: string;
  totalWatchTime: number;
  completion: number;
  retentionData: {
    time: string;
    watched: number;
  }[];
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export function AnalyticsDashboard({ videoId }: { videoId:string }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewerAnalytics, setViewerAnalytics] = useState<ViewerAnalytics[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect to load video metadata
  useEffect(() => {
    if (isClient) {
      const videosJSON = localStorage.getItem("videos");
      const allVideos: Video[] = videosJSON ? JSON.parse(videosJSON) : [];
      const currentVideo = allVideos.find((v) => v.id === videoId);
      if (currentVideo) {
        setVideo(currentVideo);
      } else {
        router.push('/');
        toast({
            title: "Video not found",
            description: "The requested video does not exist.",
            variant: "destructive"
        });
      }
      setVideosLoaded(true);
    }
  }, [videoId, isClient, router, toast]);
  
  const shareUrl = useMemo(() => {
    if (!isClient) return "";
    return `${window.location.origin}/watch/${videoId}`;
  }, [videoId, isClient]);

  // Effect to poll for analytics data
  useEffect(() => {
    if (!isClient || !video) return;

    const updateAnalytics = () => {
      const keys = Object.keys(localStorage);
      const viewerKeys = keys.filter(key => key.startsWith(`analytics-${videoId}-`));
      setViewerCount(viewerKeys.length);

      const analytics: ViewerAnalytics[] = viewerKeys.map(key => {
        const rawData = localStorage.getItem(key);
        if (!rawData) return null;

        try {
            const watchData: WatchData = JSON.parse(rawData);
            const viewerId = key.split('-')[2];

            const watchedSeconds = new Set<number>();
            watchData.watchedSegments.forEach(([start, end]) => {
                for (let i = Math.floor(start); i <= Math.ceil(end); i++) {
                    if (i >= 0 && i < video.duration) {
                        watchedSeconds.add(i);
                    }
                }
            });
            
            const retentionData = Array.from({ length: Math.ceil(video.duration) }, (_, i) => ({
                time: formatTime(i),
                watched: watchedSeconds.has(i) ? 1 : 0,
            }));
            
            const totalWatchTime = watchedSeconds.size;
            const completion = video.duration > 0 ? (totalWatchTime / video.duration) * 100 : 0;

            return {
                id: viewerId,
                name: watchData.viewerName,
                totalWatchTime,
                completion: Math.round(completion),
                retentionData,
            };
        } catch(e) {
            console.error("Failed to parse analytics data for key:", key, e);
            return null;
        }
      }).filter((v): v is ViewerAnalytics => v !== null)
      .sort((a,b) => b.totalWatchTime - a.totalWatchTime);
      
      setViewerAnalytics(analytics);
    };

    updateAnalytics(); // Initial call
    const interval = setInterval(updateAnalytics, 2000); // Poll every 2 seconds
    
    const storageListener = () => updateAnalytics();
    window.addEventListener('storage', storageListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', storageListener);
    }
  }, [isClient, video, videoId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  if (!isClient || !videosLoaded || !video) {
    return (
      <div className="w-full max-w-6xl space-y-6">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-64" />
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  const chartConfig = {
      watched: { label: "Watched", color: "hsl(var(--primary))" },
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="truncate">{video.name}</CardTitle>
          <CardDescription>Share this link with your audience to track their engagement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-lg items-center space-x-2">
            <Input value={shareUrl} readOnly />
            <Button type="button" size="icon" onClick={handleCopy} aria-label="Copy Share Link">
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Overall Analytics</CardTitle>
            <CardDescription>
              High-level statistics from all viewers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg bg-muted/50">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><User />Total Unique Viewers</h3>
                <p className="text-4xl font-bold">{viewerCount}</p>
              </div>
            </div>
            {viewerCount === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No analytics data yet. Share your video to get started!</p>
              </div>
            )}
          </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Per-Viewer Analytics</CardTitle>
            <CardDescription>
                Detailed breakdown of each viewer&apos;s engagement.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {viewerAnalytics.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {viewerAnalytics.map(viewer => (
                        <AccordionItem value={viewer.id} key={viewer.id}>
                            <AccordionTrigger>
                                <div className="flex items-center gap-4">
                                    <span className="font-medium">{viewer.name}</span>
                                    <Badge variant="outline">{viewer.completion}% complete</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <div className="text-muted-foreground">Watch Time</div>
                                            <div className="font-semibold">{formatTime(viewer.totalWatchTime)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                                        <Percent className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <div className="text-muted-foreground">Completion</div>
                                            <div className="font-semibold">{viewer.completion}%</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><BarChart3/> Retention Graph</h4>
                                <div className="h-40 w-full">
                                  <ChartContainer config={chartConfig} className="h-full w-full">
                                      <AreaChart accessibilityLayer data={viewer.retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                          <CartesianGrid vertical={false} />
                                          <XAxis 
                                              dataKey="time" 
                                              tickLine={false} 
                                              axisLine={false} 
                                              tickMargin={8}
                                              interval={0}
                                              tickFormatter={(value, index) => {
                                                  const duration = Math.ceil(video.duration);
                                                  let tickInterval = 60; 
                                                  if (duration <= 120) { tickInterval = 15; } 
                                                  else if (duration <= 600) { tickInterval = 60; } 
                                                  else if (duration <= 3600) { tickInterval = 300; } 
                                                  else { tickInterval = 600; }
                                                  
                                                  if (index % tickInterval === 0 || index === duration - 1) {
                                                      return value;
                                                  }
                                                  return "";
                                              }}
                                          />
                                          <ChartTooltip
                                              cursor={true}
                                              content={<ChartTooltipContent 
                                                  indicator="dot"
                                                  labelKey="time"
                                                  formatter={(val) => (val === 1 ? "Watched" : "Not Watched")}
                                              />}
                                          />
                                          <Area dataKey="watched" type="step" fill="var(--color-watched)" fillOpacity={0.4} stroke="var(--color-watched)" strokeWidth={2} dot={false} />
                                      </AreaChart>
                                  </ChartContainer>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">No detailed viewer data available yet.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
