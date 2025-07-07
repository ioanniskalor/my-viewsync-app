
"use client"

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { type Video } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart, Trash2, Users, Link as LinkIcon, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";


type VideoWithStats = Video & {
    viewerCount: number;
};

export function VideoDashboard() {
    const [videosWithStats, setVideosWithStats] = useState<VideoWithStats[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [copiedVideoId, setCopiedVideoId] = useState<string | null>(null);
    const { toast } = useToast();
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    const updateDashboard = useCallback(() => {
        if (!isClient) return;
        const videosJSON = localStorage.getItem("videos");
        const currentVideos: Video[] = videosJSON ? JSON.parse(videosJSON) : [];
        
        const allKeys = Object.keys(localStorage);

        const stats = currentVideos.map(video => {
            const viewerKeys = allKeys.filter(key => key.startsWith(`analytics-${video.id}-`));
            return {
                ...video,
                viewerCount: viewerKeys.length,
            };
        }).sort((a,b) => b.createdAt - a.createdAt);

        setVideosWithStats(stats);
    }, [isClient]);
    
    useEffect(() => {
        if (!isClient) return;

        updateDashboard();

        const interval = setInterval(updateDashboard, 2000);
        window.addEventListener('storage', updateDashboard);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', updateDashboard);
        };
    }, [isClient, updateDashboard]);

    const handleCopyLink = (videoToCopy: Video) => {
        const watchUrl = `${window.location.origin}/watch/${videoToCopy.id}`;
        navigator.clipboard.writeText(watchUrl);
        setCopiedVideoId(videoToCopy.id);
        toast({
            title: "Watch Page Link Copied",
            description: "You can share this link after you deploy your app.",
        });
        setTimeout(() => {
            setCopiedVideoId(null);
        }, 2000);
    };

    const handleDeleteVideo = async (videoToDelete: Video) => {
        try {
            const storageRef = ref(storage, videoToDelete.url);
            await deleteObject(storageRef);
            
            Object.keys(localStorage)
                .filter(key => key.startsWith(`analytics-${videoToDelete.id}-`))
                .forEach(key => localStorage.removeItem(key));
            
            const videosJSON = localStorage.getItem("videos");
            const currentVideos: Video[] = videosJSON ? JSON.parse(videosJSON) : [];
            const updatedVideos = currentVideos.filter(v => v.id !== videoToDelete.id);
            localStorage.setItem("videos", JSON.stringify(updatedVideos));
            
            updateDashboard();
            
            toast({
                title: "Video Deleted",
                description: `"${videoToDelete.name}" has been removed.`,
            });
        } catch (error) {
            console.error("Failed to delete video:", error);
            toast({
                title: "Deletion Failed",
                description: "Could not delete the video. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    if (!isClient) {
        return (
            <div className="space-y-6">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Video Dashboard</CardTitle>
                        <CardDescription>Your uploaded videos and their analytics will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-muted-foreground">Loading videos...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Video Dashboard</CardTitle>
                    <CardDescription>Your uploaded videos. Drop a video file anywhere on the page to add a new one.</CardDescription>
                </CardHeader>
                <CardContent>
                    {videosWithStats.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
                                    <TableHead className="hidden md:table-cell text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>Viewers</span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {videosWithStats.map(video => (
                                    <TableRow key={video.id}>
                                        <TableCell className="font-medium truncate max-w-[120px] sm:max-w-xs">{video.name}</TableCell>
                                        <TableCell className="hidden lg:table-cell text-muted-foreground">{format(new Date(video.createdAt), "PP")}</TableCell>
                                        <TableCell className="hidden md:table-cell text-center font-mono">{video.viewerCount}</TableCell>
                                        <TableCell className="text-right space-x-1 sm:space-x-2">
                                            <Button asChild variant="ghost" size="icon">
                                                <Link href={`/analytics/${video.id}`} title="View Analytics">
                                                    <BarChart />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleCopyLink(video)} title="Copy Sharable Watch Page Link">
                                                {copiedVideoId === video.id ? <Check /> : <LinkIcon />}
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete Video">
                                                        <Trash2 />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the video &quot;{video.name}&quot; and all its analytics data. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteVideo(video)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground text-center">You haven&apos;t uploaded any videos yet. <br/>Drop a file anywhere to start.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
