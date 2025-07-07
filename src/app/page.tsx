"use client";

import { useState } from 'react';
import { Logo } from '@/components/logo';
import { VideoDashboard } from '@/components/video-dashboard';
import { VideoUploadDialog } from '@/components/video-uploader';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setDroppedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please drop a valid video file.",
          variant: "destructive"
        })
      }
    }
  };

  const onDialogClose = () => {
    setDroppedFile(null);
  };

  return (
    <main 
      onDragEnter={handleDrag}
      className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background relative"
    >
      <div className="w-full max-w-4xl mx-auto z-10">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <VideoDashboard />
      </div>

      {/* The drop zone overlay */}
      {dragActive && (
        <div 
          className="absolute inset-0 w-full h-full bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center z-50"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
            <div className="flex flex-col items-center justify-center p-8 border-4 border-dashed border-primary rounded-xl bg-background/80">
                <UploadCloud className="h-16 w-16 text-primary" />
                <p className="mt-4 text-xl font-medium text-primary">Drop Video to Upload</p>
            </div>
        </div>
      )}

      {/* The upload dialog */}
      <VideoUploadDialog
        file={droppedFile}
        onClose={onDialogClose}
      />
    </main>
  );
}
