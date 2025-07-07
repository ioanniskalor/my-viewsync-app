
"use client";

import { useEffect, useRef, useState } from "react";
import { type Video, type WatchData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Viewer = {
  id: string;
  name: string;
}

const NameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
});
type NameFormValues = z.infer<typeof NameSchema>;

function NameForm({ onSubmit, isSubmitting }: { onSubmit: (name: string) => void; isSubmitting: boolean }) {
  const form = useForm<NameFormValues>({
    resolver: zodResolver(NameSchema),
    defaultValues: { name: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data.name))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Start Watching
        </Button>
      </form>
    </Form>
  );
}

export function VideoPlayer({ videoId }: { videoId: string }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedSegmentsRef = useRef<[number, number][]>([]);

  // Effect to load video metadata from localStorage
  useEffect(() => {
    const videosJSON = localStorage.getItem("videos");
    if (videosJSON) {
      const allVideos: Video[] = JSON.parse(videosJSON);
      const currentVideo = allVideos.find((v) => v.id === videoId);
      setVideo(currentVideo || null);
    }
    setVideosLoaded(true);
  }, [videoId]);

  // Effect to load viewer from localStorage
  useEffect(() => {
    const viewerJSON = localStorage.getItem("viewer");
    if (viewerJSON) {
        setViewer(JSON.parse(viewerJSON));
    }
    setViewerLoaded(true);
  }, []);

  // Effect to log watch data more accurately
  useEffect(() => {
    if (!viewer || !video) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    const analyticsKey = `analytics-${video.id}-${viewer.id}`;
    let segmentStartTime: number | null = null;

    // Load existing data from localStorage
    const loadExistingData = () => {
        try {
            const existingDataJSON = localStorage.getItem(analyticsKey);
            if (existingDataJSON) {
                const existingData: WatchData = JSON.parse(existingDataJSON);
                watchedSegmentsRef.current = existingData.watchedSegments || [];
            } else {
                 const initialData: WatchData = { viewerName: viewer.name, watchedSegments: [] };
                 localStorage.setItem(analyticsKey, JSON.stringify(initialData));
            }
        } catch {
            watchedSegmentsRef.current = [];
        }
    };
    loadExistingData();
    
    // Helper to merge overlapping or contiguous segments
    const mergeSegments = (segments: [number, number][]) => {
      if (segments.length <= 1) return segments;
      segments.sort((a, b) => a[0] - b[0]);
      const merged: [number, number][] = [segments[0]];
      for (let i = 1; i < segments.length; i++) {
          const last = merged[merged.length - 1];
          const current = segments[i];
          // Use a small tolerance to merge segments that are close
          if (current[0] <= last[1] + 1.5) { 
              last[1] = Math.max(last[1], current[1]);
          } else {
              merged.push(current);
          }
      }
      return merged;
    };

    // Save the currently active watch segment
    const saveCurrentSegment = () => {
        if (segmentStartTime === null) return;
        
        const currentTime = videoEl.currentTime;
        if (currentTime > segmentStartTime) {
            watchedSegmentsRef.current.push([segmentStartTime, currentTime]);
            watchedSegmentsRef.current = mergeSegments(watchedSegmentsRef.current);
            const dataToSave: WatchData = {
                viewerName: viewer.name,
                watchedSegments: watchedSegmentsRef.current,
            };
            localStorage.setItem(analyticsKey, JSON.stringify(dataToSave));
        }
    };
    
    // When playback starts, record the time
    const handlePlay = () => {
        segmentStartTime = videoEl.currentTime;
    };

    // When playback stops (pause, end, seek), save the segment
    const handlePause = () => {
        saveCurrentSegment();
        segmentStartTime = null; // No active segment while paused
    };
    
    // A periodic save during long playback sessions is good for crash recovery
    const interval = setInterval(() => {
        if (!videoEl.paused) {
            saveCurrentSegment();
            // Start a new segment from the current time
            segmentStartTime = videoEl.currentTime;
        }
    }, 10000); // Save every 10 seconds of active playback

    videoEl.addEventListener('play', handlePlay);
    videoEl.addEventListener('pause', handlePause);
    videoEl.addEventListener('ended', handlePause); // The 'ended' event is a final pause
    window.addEventListener('beforeunload', handlePause); // Save when user leaves the page

    // Cleanup listeners on component unmount
    return () => {
        handlePause(); // Final save before unmounting
        videoEl.removeEventListener('play', handlePlay);
        videoEl.removeEventListener('pause', handlePause);
        videoEl.removeEventListener('ended', handlePause);
        window.removeEventListener('beforeunload', handlePause);
        clearInterval(interval);
    };
  }, [viewer, video, videoId]);

  const handleNameSubmit = (name: string) => {
    // Generate a random ID for the new viewer and save to state and localStorage
    const newViewer = { id: crypto.randomUUID(), name };
    setViewer(newViewer);
    localStorage.setItem("viewer", JSON.stringify(newViewer));
  };
  
  if (!videosLoaded || !viewerLoaded) {
    return (
      <div className="w-full max-w-5xl">
        <CardHeader>
            <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent>
            <Skeleton className="w-full aspect-video" />
        </CardContent>
      </div>
    );
  }

  if (!viewer) {
    return (
        <div className="w-full max-w-md mx-auto pt-16">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                    <CardDescription>Please enter your name to watch the video.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NameForm onSubmit={handleNameSubmit} isSubmitting={!viewerLoaded} />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!video) {
    return (
        <Card className="w-full max-w-5xl shadow-lg">
            <CardHeader>
                <CardTitle>Video not found</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 items-start">
                <p>This video link is either invalid or the data could not be found.</p>
                <Button asChild>
                    <Link href="/">Upload a Video</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl shadow-lg overflow-hidden">
      <div className="bg-black">
        <video ref={videoRef} controls autoPlay muted src={video.url} className="w-full aspect-video">
          Your browser does not support the video tag.
        </video>
      </div>
      <CardHeader>
        <CardTitle>{video.name}</CardTitle>
        <CardDescription>Viewing as: {viewer.name}</CardDescription>
      </CardHeader>
    </Card>
  );
}
