import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/upload - Upload a PDF file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("NEXT_PUBLIC_SUPABASE_URL is not set");
      return NextResponse.json(
        { error: "Server configuration error: Supabase URL not configured" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error: Supabase service key not configured" },
        { status: 500 }
      );
    }

    // Create admin client with service role key (bypasses RLS)
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type - check both MIME type and file extension
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isValidPdfType = 
      file.type === "application/pdf" || 
      file.type === "" || // Some browsers don't set MIME type
      fileExt === "pdf";

    if (!isValidPdfType) {
      return NextResponse.json(
        { error: "Only PDF files are allowed. Please select a PDF file." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty. Please select a valid PDF file." },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt || "pdf"}`;
    // Use profile ID for storage path
    const filePath = `${profile.id}/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const bucketName = "Assignments";
    
    // Check if bucket exists, create if it doesn't (with error handling)
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      // Continue anyway - bucket might exist but we can't list it
    } else {
      const bucketExists = buckets?.some(b => b.id === bucketName);
      if (!bucketExists) {
        // Try to create the bucket
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ["application/pdf"],
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (createError) {
          console.error("Error creating bucket:", createError);
          // Continue anyway - might already exist or have permission issues
        }
      }
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      
      // Provide more specific error messages
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          { error: "Storage bucket not found. Please contact administrator to set up the 'Assignments' bucket in Supabase Storage." },
          { status: 500 }
        );
      }
      
      if (uploadError.message?.includes("duplicate")) {
        return NextResponse.json(
          { error: "A file with this name already exists. Please try again." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: uploadError.message || "Failed to upload file. Please check your file and try again." },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    if (!publicUrl) {
      return NextResponse.json(
        { error: "File uploaded but failed to generate public URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      path: filePath,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("ENOENT") || error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Storage configuration error. Please contact administrator." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
