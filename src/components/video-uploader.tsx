
"use client";

import { useState, useEffect, useRef } from "react";
import { type Video } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, Terminal } from "lucide-react";
import Link from "next/link";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, type FirebaseStorageError, type UploadTask } from "firebase/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FormSchema = z.object({
  title: z.string().min(1, "A title is required."),
});

type FormValues = z.infer<typeof FormSchema>;

interface VideoUploadDialogProps {
  file: File | null;
  onClose: () => void;
}

const CORS_ERROR_MESSAGE = (bucket: string) => (
    <>
      <p className="mb-2">This is a common Firebase setup issue caused by CORS policy. To fix it, you must run a command using the Google Cloud CLI.</p>
      <p className="mb-2">1. If you haven&apos;t already, install the <a href="https://cloud.google.com/sdk/docs/install" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud SDK</a>.</p>
      <p className="mb-2">2. Create a file named <strong>cors.json</strong> with this content:</p>
      <pre className="text-xs p-2 bg-slate-800 text-white rounded-md mb-2">{`[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]`}</pre>
      <p className="mb-2">3. In your terminal, navigate to where you saved that file and run this command:</p>
      <pre className="text-xs p-2 bg-slate-800 text-white rounded-md">gcloud storage buckets update gs://{bucket} --cors-file=cors.json</pre>
    </>
);


export function VideoUploadDialog({ file, onClose }: VideoUploadDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<React.ReactNode | null>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { title: "" },
  });
  
  useEffect(() => {
    if (file) {
      form.reset({ title: file.name.replace(/\.[^/.]+$/, "") });
      setUploadError(null);
    }
  }, [file, form]);

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        resolve(videoEl.duration);
      }
      videoEl.onerror = () => {
        window.URL.revokeObjectURL(videoEl.src);
        reject("Could not load video metadata.");
      }
      videoEl.src = window.URL.createObjectURL(file);
    });
  };
  
  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    uploadTaskRef.current = null;
  }

  const handleDialogClose = (open: boolean) => {
      if (!open && !isProcessing) {
          onClose();
          setProgress(0);
          form.reset();
          setUploadError(null);
          if (uploadTaskRef.current) {
            uploadTaskRef.current.cancel();
          }
          cleanup();
      }
  }

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setUploadError(null);

    const startTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (uploadTaskRef.current) {
              uploadTaskRef.current.cancel();
            }
            const bucket = storage.app.options.storageBucket || 'YOUR_BUCKET_NAME.appspot.com';
            setUploadError(CORS_ERROR_MESSAGE(bucket));
            setIsProcessing(false);
            cleanup();
        }, 15000); // 15 second timeout
    };


    try {
        const duration = await getDuration(file);
        
        const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTaskRef.current = uploadTask;
        startTimeout();


        uploadTask.on('state_changed',
            (snapshot) => {
                startTimeout(); // Reset the timeout on every progress update
                const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(Math.round(percentage));
            },
            (error: FirebaseStorageError) => {
                cleanup();
                console.error("Firebase Upload Error:", error);
                let description: React.ReactNode = "An unknown error occurred. Please try again.";
                const bucket = storage.app.options.storageBucket || 'YOUR_BUCKET_NAME.appspot.com';
                switch (error.code) {
                    case 'storage/quota-exceeded':
                        description = "You have exceeded your storage quota (5GB on the free plan). Please delete other videos or upgrade your plan in the Firebase Console.";
                        break;
                    case 'storage/unauthorized':
                        description = "Permission denied. Please check the guide on the main dashboard to set your Firebase Storage rules correctly.";
                        break;
                    case 'storage/canceled':
                        description = CORS_ERROR_MESSAGE(bucket);
                        break;
                    case 'storage/unauthenticated':
                        description = "Permission denied. Please check the guide on the main dashboard to set your Firebase Storage rules correctly.";
                        break;
                    case 'storage/unknown':
                        description = "An unknown error occurred, please check your internet connection.";
                        break;
                    default:
                        description = `An unexpected error occurred. Code: ${error.code}. Message: ${error.message}.`;
                        break;
                }
                
                setUploadError(description);
                setIsProcessing(false);
            },
            async () => {
                cleanup();
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const newVideo: Video = {
                    id: crypto.randomUUID(),
                    name: data.title,
                    createdAt: Date.now(),
                    url: downloadURL,
                    duration: Math.round(duration),
                };

                const videosJSON = localStorage.getItem("videos");
                const currentVideos: Video[] = videosJSON ? JSON.parse(videosJSON) : [];
                localStorage.setItem("videos", JSON.stringify([newVideo, ...currentVideos]));
                
                toast({
                    title: "Video Uploaded!",
                    description: `"${newVideo.name}" is now in your dashboard.`,
                    action: (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/analytics/${newVideo.id}`}>View Analytics</Link>
                        </Button>
                    ),
                });
                
                setIsProcessing(false);
                handleDialogClose(false);
            }
        );
    } catch (error) {
        cleanup();
        const errorMessage = error instanceof Error ? error.message : "Could not process video before upload.";
        setUploadError(errorMessage);
        setIsProcessing(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
          <DialogHeader>
              <DialogTitle>Finalize Upload</DialogTitle>
              <DialogDescription>
                  Give your video a title. It will be added to your dashboard.
              </DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="text-sm font-medium p-2 bg-muted rounded-md truncate">
                      File: <span className="text-muted-foreground">{file?.name}</span>
                  </div>
                  <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Video Title</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., Q2 Product Demo" {...field} disabled={isProcessing} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />

                  {uploadError && (
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Upload Failed</AlertTitle>
                        <AlertDescription>
                            {uploadError}
                        </AlertDescription>
                    </Alert>
                  )}

                  {isProcessing && !uploadError && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <p className="text-xs text-muted-foreground text-center">
                            { progress < 100 ? `Uploading... ${progress}%` : 'Finalizing...'}
                        </p>
                      </div>
                  )}

                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isProcessing}>
                          Cancel
                      </Button>
                      <Button type="submit" disabled={isProcessing || !form.formState.isValid}>
                          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isProcessing ? "Uploading..." : "Add to Dashboard"}
                      </Button>
                  </DialogFooter>
              </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
