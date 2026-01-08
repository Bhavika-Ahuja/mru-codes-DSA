# Assignment Feature Setup Guide

This guide explains how to set up the assignment feature with PDF upload support using Supabase Storage.

## Database Setup

The database schema has been automatically updated with the following models:
- `Assignment` - Stores assignment details (title, description, PDF URL, due date, etc.)
- `AssignmentSubmission` - Stores student submissions with grading information

## Supabase Storage Setup

### Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. Click **Create a new bucket**
4. Enter the bucket name: `Assignments` (with capital A)
5. Check **Public bucket** (to allow public access to PDFs)
6. Click **Create bucket**

### Step 2: Configure Environment Variables

Make sure your `.env` or `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is used for file uploads and bypasses RLS policies. Keep this key secure and never expose it to the client side.

## Features

### For Teachers:
- **Create Assignments**: Upload PDF assignments with title, description, topic, difficulty, points, and due date
- **Manage Assignments**: View, edit, and delete assignments
- **View Submissions**: See all student submissions for an assignment
- **Grade Submissions**: Assign grades and provide feedback to students

### For Students:
- **View Assignments**: Browse all published assignments
- **Download Assignment PDF**: View assignment requirements
- **Submit Solutions**: Upload PDF solutions (max 10MB)
- **View Grades**: See grades and feedback from teachers
- **Resubmit**: Update submissions if allowed by teacher

## API Routes

### Assignment Management (Teachers)
- `GET /api/assignments` - List all assignments (teacher's own)
- `POST /api/assignments` - Create new assignment
- `GET /api/assignments/[id]` - Get assignment details
- `PATCH /api/assignments/[id]` - Update assignment
- `DELETE /api/assignments/[id]` - Delete assignment

### Submissions (Students & Teachers)
- `POST /api/assignments/[id]/submissions` - Submit assignment solution
- `GET /api/assignments/[id]/submissions` - Get all submissions (teacher only)
- `PATCH /api/submissions/[id]/grade` - Grade a submission (teacher only)

### File Upload
- `POST /api/upload` - Upload PDF file to Supabase Storage

## File Structure

PDFs are stored in Supabase Storage with the following structure:
```
Assignments/ (bucket)
  └── {user_id}/
      └── {timestamp}-{random}.pdf
```

## Notes

- Maximum file size: 10MB per PDF
- Only PDF files are accepted
- Files are organized by user ID for easy management
- Assignment status can be: `draft`, `published`, or `closed`
- Submission status can be: `submitted`, `graded`, or `returned`
