import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedQuestion } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    // Verify user is authenticated and is a teacher
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can generate questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { topic, difficulty = "medium", count = 5 } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert DSA instructor creating quiz questions for computer science students.

Generate ${count} multiple-choice questions about "${topic}" in Data Structures and Algorithms.

Difficulty level: ${difficulty}

Requirements:
- Each question should have exactly 4 options
- Only one option should be correct
- Include a brief explanation for the correct answer
- Questions should test understanding, not just memorization
- Vary the question types (conceptual, code analysis, time complexity, etc.)

Return the response in this exact JSON format (no markdown, no code blocks, just pure JSON):
{
  "questions": [
    {
      "question_text": "The question text here",
      "options": [
        { "text": "Option A", "is_correct": false },
        { "text": "Option B", "is_correct": true },
        { "text": "Option C", "is_correct": false },
        { "text": "Option D", "is_correct": false }
      ],
      "explanation": "Explanation of why the correct answer is correct"
    }
  ]
}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content) as { questions: GeneratedQuestion[] };

    return NextResponse.json({
      success: true,
      questions: parsed.questions,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
