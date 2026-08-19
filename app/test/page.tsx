"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Server,
  Database,
  Cloud,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from "lucide-react";

interface StatusData {
  status: string;
  timestamp: string;
  cloudinary: {
    isConfigured: boolean;
    cloudName: string | null;
    hasApiKey: boolean;
    hasApiSecret: boolean;
  };
  mongodb: {
    connected: boolean;
    message: string;
  };
  auth: {
    hasNextAuthSecret: boolean;
    hasNextAuthUrl: boolean;
  };
  ai: {
    hasGemini: boolean;
    hasAnthropic: boolean;
    hasHuggingFace: boolean;
  };
}

interface UploadResult {
  success: boolean;
  secureUrl?: string;
  folder?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  durationMs?: number;
  timestamp?: string;
  error?: string;
}

export default function TestBenchPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "status">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>("ciirs-listings");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/test-upload");
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP, etc.)");
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("folder", folderName || "ciirs-listings");

    try {
      const res = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setUploadResult({
          success: false,
          error: data.error || `Upload failed with HTTP ${res.status}`,
        });
      } else {
        setUploadResult(data);
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        error: err.message || "Network error while uploading",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Banner */}
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "12px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                backgroundColor: "#f59e0b",
                color: "#000",
                fontSize: "0.75rem",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "9999px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Test Mode
            </span>
            <span style={{ fontSize: "0.875rem", color: "#fbbf24" }}>
              Temporary verification testbench for Cloudinary & App Status. Can be deleted before production.
            </span>
          </div>
          <button
            onClick={fetchStatus}
            disabled={isLoadingStatus}
            style={{
              background: "transparent",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RefreshCw size={14} className={isLoadingStatus ? "animate-spin" : ""} />
            {isLoadingStatus ? "Checking..." : "Refresh Status"}
          </button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Cloud size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "700", margin: 0, color: "#ffffff" }}>
                CIIRS Cloudinary & System Testbench
              </h1>
              <p style={{ margin: "2px 0 0 0", color: "#a1a1aa", fontSize: "0.9rem" }}>
                Test <code style={{ color: "#38bdf8", background: "#18181b", padding: "1px 6px", borderRadius: "4px" }}>lib/cloudinary.ts</code> upload function & verify live application state
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              borderBottom: "1px solid #27272a",
              paddingTop: "1rem",
            }}
          >
            <button
              onClick={() => setActiveTab("upload")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "upload" ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === "upload" ? "#ffffff" : "#71717a",
                padding: "0.5rem 1rem",
                fontWeight: activeTab === "upload" ? "600" : "400",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              <Upload size={16} />
              Photo Upload Test
            </button>
            <button
              onClick={() => setActiveTab("status")}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "status" ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === "status" ? "#ffffff" : "#71717a",
                padding: "0.5rem 1rem",
                fontWeight: activeTab === "status" ? "600" : "400",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
              }}
            >
              <Server size={16} />
              App Health & Environment
            </button>
          </div>
        </div>

        {/* Tab 1: Upload Tester */}
        {activeTab === "upload" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
            {/* Upload Form Card */}
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "14px",
                padding: "1.5rem",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
              }}
            >
              <h2 style={{ fontSize: "1.15rem", fontWeight: "600", marginTop: 0, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ImageIcon size={18} color="#38bdf8" />
                Upload Waste Photo
              </h2>

              {/* Target Folder Selector */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#a1a1aa", marginBottom: "0.4rem" }}>
                  Cloudinary Folder
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="ciirs-listings"
                  style={{
                    width: "100%",
                    backgroundColor: "#09090b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    padding: "0.6rem 0.8rem",
                    color: "#f4f4f5",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "#71717a", display: "block", marginTop: "4px" }}>
                  Default is <code style={{ color: "#a1a1aa" }}>ciirs-listings</code>
                </span>
              </div>

              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? "2px dashed #3b82f6" : "2px dashed #3f3f46",
                  backgroundColor: isDragging ? "rgba(59, 130, 246, 0.08)" : "#09090b",
                  borderRadius: "10px",
                  padding: "2rem 1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginBottom: "1.25rem",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <Upload size={32} color={isDragging ? "#3b82f6" : "#71717a"} style={{ margin: "0 auto 0.75rem" }} />
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", fontWeight: "500", color: "#e4e4e7" }}>
                  Click to browse or drag & drop image
                </p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#71717a" }}>
                  Supports PNG, JPG, JPEG, WebP, GIF
                </p>
              </div>

              {/* Selected File Details & Preview */}
              {selectedFile && previewUrl && (
                <div
                  style={{
                    backgroundColor: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "6px",
                      objectFit: "cover",
                      border: "1px solid #3f3f46",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        color: "#f4f4f5",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
                      {formatBytes(selectedFile.size)} • {selectedFile.type}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                style={{
                  width: "100%",
                  backgroundColor: selectedFile && !isUploading ? "#2563eb" : "#27272a",
                  color: selectedFile && !isUploading ? "#ffffff" : "#71717a",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: selectedFile && !isUploading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "background-color 0.2s ease",
                }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Uploading via uploadWastePhoto...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload to Cloudinary
                  </>
                )}
              </button>
            </div>

            {/* Upload Result Card */}
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "14px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2 style={{ fontSize: "1.15rem", fontWeight: "600", marginTop: 0, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} color="#10b981" />
                Upload Output & Details
              </h2>

              {!uploadResult && !isUploading && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#71717a",
                    textAlign: "center",
                    padding: "2rem",
                    border: "1px dashed #27272a",
                    borderRadius: "10px",
                  }}
                >
                  <Cloud size={40} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>
                    Select an image and click upload to inspect Cloudinary CDN results in real time.
                  </p>
                </div>
              )}

              {isUploading && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a1a1aa",
                    padding: "3rem",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      border: "3px solid #27272a",
                      borderTopColor: "#3b82f6",
                      animation: "spin 1s linear infinite",
                      marginBottom: "1rem",
                    }}
                  />
                  <p style={{ margin: 0, fontWeight: "500" }}>Streaming buffer to Cloudinary API...</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#71717a" }}>
                    Executing <code style={{ color: "#38bdf8" }}>cloudinary.uploader.upload_stream</code>
                  </p>
                </div>
              )}

              {uploadResult && (
                <div>
                  {/* Status Indicator */}
                  <div
                    style={{
                      backgroundColor: uploadResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      border: uploadResult.success ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {uploadResult.success ? (
                      <>
                        <CheckCircle2 size={18} color="#10b981" />
                        <div>
                          <div style={{ color: "#10b981", fontWeight: "600", fontSize: "0.9rem" }}>
                            Upload Successful!
                          </div>
                          <div style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>
                            Returned secure HTTPS URL from Cloudinary CDN in {uploadResult.durationMs}ms
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={18} color="#ef4444" />
                        <div>
                          <div style={{ color: "#ef4444", fontWeight: "600", fontSize: "0.9rem" }}>
                            Upload Failed
                          </div>
                          <div style={{ color: "#fca5a5", fontSize: "0.75rem" }}>
                            {uploadResult.error}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {uploadResult.success && uploadResult.secureUrl && (
                    <>
                      {/* Image Preview directly from Cloudinary */}
                      <div
                        style={{
                          backgroundColor: "#09090b",
                          border: "1px solid #27272a",
                          borderRadius: "10px",
                          overflow: "hidden",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <div style={{ padding: "0.6rem 0.8rem", borderBottom: "1px solid #27272a", fontSize: "0.8rem", color: "#a1a1aa", display: "flex", justifyContent: "space-between" }}>
                          <span>Cloudinary CDN Live Render</span>
                          <span style={{ color: "#10b981", fontWeight: "500" }}>✓ Loaded from URL</span>
                        </div>
                        <div style={{ padding: "1rem", display: "flex", justifyContent: "center", backgroundColor: "#000000" }}>
                          <img
                            src={uploadResult.secureUrl}
                            alt="Uploaded output"
                            style={{
                              maxHeight: "220px",
                              maxWidth: "100%",
                              borderRadius: "6px",
                              objectFit: "contain",
                            }}
                          />
                        </div>
                      </div>

                      {/* Secure URL Box */}
                      <div style={{ marginBottom: "1.25rem" }}>
                        <label style={{ display: "block", fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.3rem" }}>
                          Returned <code style={{ color: "#38bdf8" }}>secure_url</code>
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            backgroundColor: "#09090b",
                            border: "1px solid #3f3f46",
                            borderRadius: "8px",
                            padding: "0.4rem 0.6rem",
                          }}
                        >
                          <input
                            readOnly
                            value={uploadResult.secureUrl}
                            style={{
                              flex: 1,
                              backgroundColor: "transparent",
                              border: "none",
                              color: "#38bdf8",
                              fontSize: "0.85rem",
                              outline: "none",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          />
                          <button
                            onClick={() => copyToClipboard(uploadResult.secureUrl!)}
                            title="Copy URL"
                            style={{
                              background: "#27272a",
                              border: "none",
                              color: "#f4f4f5",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                            }}
                          >
                            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                          <a
                            href={uploadResult.secureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "#27272a",
                              border: "none",
                              color: "#f4f4f5",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                            }}
                          >
                            <ExternalLink size={13} />
                            Open
                          </a>
                        </div>
                      </div>

                      {/* Metadata Chips */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ background: "#09090b", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
                          <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>Latency</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f4f4f5" }}>{uploadResult.durationMs} ms</span>
                        </div>
                        <div style={{ background: "#09090b", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
                          <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>Folder</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f4f4f5" }}>{uploadResult.folder}</span>
                        </div>
                        <div style={{ background: "#09090b", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
                          <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>File Size</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f4f4f5" }}>{formatBytes(uploadResult.fileSize)}</span>
                        </div>
                        <div style={{ background: "#09090b", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
                          <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>Type</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#f4f4f5" }}>{uploadResult.fileType || "image/*"}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Raw JSON viewer */}
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "#71717a" }}>
                      View Raw JSON Response
                    </summary>
                    <pre
                      style={{
                        backgroundColor: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        fontSize: "0.75rem",
                        color: "#a1a1aa",
                        overflowX: "auto",
                        marginTop: "0.5rem",
                      }}
                    >
                      {JSON.stringify(uploadResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Environment & App Status */}
        {activeTab === "status" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* Cloudinary Status Card */}
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "14px",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Cloud size={20} color="#38bdf8" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600" }}>Cloudinary Storage</h3>
                </div>
                {statusData?.cloudinary.isConfigured ? (
                  <span style={{ color: "#10b981", fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
                    Configured
                  </span>
                ) : (
                  <span style={{ color: "#f87171", fontSize: "0.75rem", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
                    Missing Keys
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>CLOUDINARY_CLOUD_NAME</span>
                  <span style={{ color: statusData?.cloudinary.cloudName ? "#38bdf8" : "#71717a", fontWeight: "500" }}>
                    {statusData?.cloudinary.cloudName || "Not set"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>CLOUDINARY_API_KEY</span>
                  <span style={{ color: statusData?.cloudinary.hasApiKey ? "#10b981" : "#f87171", fontWeight: "500" }}>
                    {statusData?.cloudinary.hasApiKey ? "✓ Present" : "✗ Missing"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0" }}>
                  <span style={{ color: "#a1a1aa" }}>CLOUDINARY_API_SECRET</span>
                  <span style={{ color: statusData?.cloudinary.hasApiSecret ? "#10b981" : "#f87171", fontWeight: "500" }}>
                    {statusData?.cloudinary.hasApiSecret ? "✓ Present" : "✗ Missing"}
                  </span>
                </div>
              </div>
            </div>

            {/* MongoDB Status Card */}
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "14px",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Database size={20} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600" }}>MongoDB Database</h3>
                </div>
                {statusData?.mongodb.connected ? (
                  <span style={{ color: "#10b981", fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
                    Connected
                  </span>
                ) : (
                  <span style={{ color: "#f87171", fontSize: "0.75rem", background: "rgba(239,68,68,0.15)", padding: "2px 8px", borderRadius: "9999px", fontWeight: "600" }}>
                    Disconnected
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>Connection State</span>
                  <span style={{ color: statusData?.mongodb.connected ? "#10b981" : "#f87171", fontWeight: "500" }}>
                    {statusData?.mongodb.connected ? "Active & Healthy" : "Offline"}
                  </span>
                </div>
                <div style={{ padding: "0.4rem 0" }}>
                  <span style={{ color: "#a1a1aa", display: "block", fontSize: "0.75rem", marginBottom: "2px" }}>Details</span>
                  <span style={{ color: "#d4d4d8", fontSize: "0.8rem" }}>
                    {statusData?.mongodb.message || "Connecting..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Auth & AI Integrations Card */}
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "14px",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <Cpu size={20} color="#a855f7" />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600" }}>Integrations Status</h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>NextAuth Secret</span>
                  <span style={{ color: statusData?.auth.hasNextAuthSecret ? "#10b981" : "#71717a", fontWeight: "500" }}>
                    {statusData?.auth.hasNextAuthSecret ? "✓ Configured" : "✗ Not set"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>Google Gemini AI</span>
                  <span style={{ color: statusData?.ai.hasGemini ? "#10b981" : "#71717a", fontWeight: "500" }}>
                    {statusData?.ai.hasGemini ? "✓ Configured" : "✗ Not set"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid #27272a" }}>
                  <span style={{ color: "#a1a1aa" }}>Anthropic Claude AI</span>
                  <span style={{ color: statusData?.ai.hasAnthropic ? "#10b981" : "#71717a", fontWeight: "500" }}>
                    {statusData?.ai.hasAnthropic ? "✓ Configured" : "✗ Not set"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0" }}>
                  <span style={{ color: "#a1a1aa" }}>HuggingFace AI</span>
                  <span style={{ color: statusData?.ai.hasHuggingFace ? "#10b981" : "#71717a", fontWeight: "500" }}>
                    {statusData?.ai.hasHuggingFace ? "✓ Configured" : "✗ Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: "2.5rem", textAlign: "center", fontSize: "0.8rem", color: "#52525b" }}>
          CIIRS ILP LIL BETA • Development & Testing Workbench • <code style={{ color: "#71717a" }}>app/test/page.tsx</code> &amp; <code style={{ color: "#71717a" }}>app/api/test-upload/route.ts</code>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
