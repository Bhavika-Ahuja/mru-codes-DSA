"use client";

import { useState, useEffect } from "react";
import { FileText, Video, Presentation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LearningContent {
  id: string;
  title: string;
  contentType: "pdf" | "ppt" | "video" | "document" | "other";
  contentUrl: string;
  fileName?: string | null;
}

export function ContentViewer({ 
  content,
  onView,
}: { 
  content: LearningContent;
  onView?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Track when content is viewed
    if (isOpen && onView) {
      onView();
    }
  }, [isOpen, onView]);

  function isGoogleDriveUrl(url: string): boolean {
    return url.includes("drive.google.com");
  }

  function isYouTubeUrl(url: string): boolean {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  function getYouTubeEmbedUrl(url: string): string {
    // Convert YouTube URL to embed format
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  function getGoogleDriveEmbedUrl(url: string): string {
    // Convert Google Drive sharing URL to embed format
    if (url.includes("/file/d/")) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    return url;
  }

  function renderContent() {
    // Handle YouTube URLs
    if (isYouTubeUrl(content.contentUrl)) {
      return (
        <div className="w-full aspect-video">
          <iframe
            src={getYouTubeEmbedUrl(content.contentUrl)}
            className="w-full h-full border-0"
            title={content.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Handle Google Drive URLs
    if (isGoogleDriveUrl(content.contentUrl)) {
      return (
        <iframe
          src={getGoogleDriveEmbedUrl(content.contentUrl)}
          className="w-full h-[80vh] border-0"
          title={content.title}
        />
      );
    }

    // Handle direct file URLs
    switch (content.contentType) {
      case "pdf":
        return (
          <iframe
            src={content.contentUrl}
            className="w-full h-[80vh] border-0"
            title={content.title}
          />
        );
      case "video":
        return (
          <video
            src={content.contentUrl}
            controls
            className="w-full max-h-[80vh]"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        );
      case "ppt":
      case "document":
      case "other":
        return (
          <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">
              Preview not available. Please open the link in a new tab.
            </p>
            <Button
              onClick={() => window.open(content.contentUrl, "_blank")}
              variant="outline"
            >
              Open in New Tab
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-[80vh]">
            <p className="text-muted-foreground">Unsupported content type</p>
          </div>
        );
    }
  }

  function getIcon() {
    switch (content.contentType) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "ppt":
        return <Presentation className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" size="sm">
        {getIcon()}
        <span className="ml-2">View</span>
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[85vh]">{renderContent()}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
