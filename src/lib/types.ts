export interface Video {
  id: string;
  name: string;
  createdAt: number;
  url: string; 
  duration: number;
}

export interface WatchData {
  viewerName: string;
  watchedSegments: [number, number][];
}
