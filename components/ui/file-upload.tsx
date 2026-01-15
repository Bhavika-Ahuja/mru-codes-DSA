"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SerializableProps = {
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  uploading?: boolean;
  uploadedFileName?: string | null;
  error?: string | null;
  label?: string;
  description?: string;
  required?: boolean;
};

type FileUploadProps = SerializableProps & {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
};

export function FileUpload(props: FileUploadProps) {
  const {
    onFileSelect,
    onFileRemove,
    accept = "application/pdf",
    maxSize = 10,
    disabled = false,
    uploading = false,
    uploadedFileName = null,
    error = null,
    label = "PDF File",
    description,
    required = false,
  } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file extension as fallback (some browsers don't set MIME type correctly)
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isValidPdf =
      file.type === "application/pdf" ||
      file.type === "" ||
      fileExt === "pdf";

    if (accept && accept.includes("pdf") && !isValidPdf) {
      return "Only PDF files are allowed";
    }

    if (file.size === 0) {
      return "File is empty. Please select a valid file.";
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
    }
    return null;
  }, [accept, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const validationError = validateFile(droppedFile);
    if (validationError) {
      return;
    }

    setFile(droppedFile);
    onFileSelect(droppedFile);
  }, [disabled, uploading, validateFile, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      return;
    }

    setFile(selectedFile);
    onFileSelect(selectedFile);
  }, [validateFile, onFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileRemove?.();
  }, [onFileRemove]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const hasFile = file !== null || uploadedFileName !== null;
  const displayFileName = uploadedFileName || file?.name;
  const displayFileSize = file ? formatFileSize(file.size) : null;

  const canInteract = !disabled && !uploading;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!canInteract) return;
          fileInputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (!canInteract) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={canInteract ? 0 : -1}
        aria-disabled={!canInteract}
        className={cn(
          "group relative border-2 border-dashed rounded-lg transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background will-change-transform",
          isDragging && !disabled && !uploading
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/60 hover:bg-muted/20 hover:shadow-sm hover:shadow-primary/10 hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]",
          canInteract ? "cursor-pointer" : "",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "opacity-75 cursor-wait",
          hasFile && !uploading && "border-green-500/50 bg-green-500/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled || uploading}
          className="hidden"
          id="file-upload-input"
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1">Uploading PDF...</p>
            <p className="text-xs text-muted-foreground">Please wait while we upload your file</p>
          </div>
        ) : hasFile ? (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm font-medium truncate">{displayFileName}</p>
                </div>
                {displayFileSize && (
                  <p className="text-xs text-muted-foreground">{displayFileSize}</p>
                )}
                {uploadedFileName && (
                  <p className="text-xs text-green-600 mt-1">Uploaded successfully</p>
                )}
              </div>
              {!uploadedFileName && onFileRemove && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer group"
                >
                  <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-0.5">
                <Upload className="h-8 w-8 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drag and drop your PDF here, or{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={disabled}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">
                  {description || `PDF files only • Maximum ${maxSize}MB`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={disabled}
                className="mt-2 transition-transform duration-200 group-hover:scale-[1.02]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {!hasFile && !uploading && !error && (
        <p className="text-xs text-muted-foreground">
          {description || `Only PDF files are allowed. Maximum file size is ${maxSize}MB.`}
        </p>
      )}
    </div>
  );
}
