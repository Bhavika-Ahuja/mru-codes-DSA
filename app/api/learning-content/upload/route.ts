import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/learning-content/upload - Upload learning content (PDF, PPT, videos, etc.)
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can upload learning content" },
        { status: 403 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const contentType = formData.get("contentType") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const allowedTypes = {
      pdf: ["pdf"],
      ppt: ["ppt", "pptx"],
      video: ["mp4", "webm", "ogg", "mov", "avi"],
      document: ["doc", "docx", "txt"],
      other: ["*"],
    };

    const typeMap = allowedTypes[contentType as keyof typeof allowedTypes];
    if (!typeMap) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const isValidType =
      typeMap.includes("*") ||
      typeMap.includes(fileExt || "") ||
      file.type.includes(contentType);

    if (!isValidType) {
      return NextResponse.json(
        { error: `Invalid file type for ${contentType}. Allowed: ${typeMap.join(", ")}` },
        { status: 400 }
      );
    }

    // Check file size (100MB max for videos, 50MB for others)
    const maxSize = contentType === "video" ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    const bucketName = "learning-content";
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${contentType}/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.id === bucketName);

    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/quicktime",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
      });
    }

    // Upload file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      contentType,
      filePath,
    });
  } catch (error) {
    console.error("Error uploading learning content:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
