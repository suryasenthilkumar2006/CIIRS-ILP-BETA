"use client";

import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PhotoUploaderProps {
  onUploadComplete: (url: string) => void;
  className?: string;
}

type UploadState = "idle" | "previewing" | "uploading" | "success" | "error";

export default function PhotoUploader({
  onUploadComplete,
  className,
}: PhotoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setUploadState("idle");
    setPreviewUrl(null);
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage("");
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WebP, GIF).");
      setUploadState("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be under 10 MB.");
      setUploadState("error");
      return;
    }

    setErrorMessage("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadState("previewing");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Simulate incremental progress since fetch doesn't expose upload progress natively
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error("Server did not return an image URL.");
      }

      setProgress(100);
      setUploadState("success");
      onUploadComplete(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
      setUploadState("error");
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Idle / Drag-and-Drop Zone */}
      {(uploadState === "idle" || uploadState === "error") && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900/80"
          )}
        >
          {/* Upload icon */}
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <p className="text-sm font-medium text-zinc-300">
            {isDragging ? "Drop your image here" : "Click to browse or drag & drop"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            PNG, JPG, WebP, GIF — Max 10 MB
          </p>

          {/* Error message */}
          {uploadState === "error" && errorMessage && (
            <div className="mt-3 rounded-md bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Preview State */}
      {uploadState === "previewing" && previewUrl && selectedFile && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-start gap-4">
            {/* Image thumbnail */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-black">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">
                {selectedFile.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={handleUpload}
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Upload Photo
                </Button>
                <Button
                  onClick={resetState}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === "uploading" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center gap-3">
            {/* Spinner */}
            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-300">
                Uploading...
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {Math.round(Math.min(progress, 100))}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState === "success" && previewUrl && (
        <div className="rounded-lg border border-emerald-800/50 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-black">
              <img
                src={previewUrl}
                alt="Uploaded"
                className="h-full w-full object-cover"
              />
              {/* Check badge */}
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-400">
                Photo uploaded successfully
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Ready for AI grading
              </p>
              <Button
                onClick={resetState}
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Upload another
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
