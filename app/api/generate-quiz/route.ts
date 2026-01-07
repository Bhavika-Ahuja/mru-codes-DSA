import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface GeneratedQuestion {
  question_text: string;
  options: {
    text: string;
    is_correct: boolean;
  }[];
  explanation: string;
}

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

    // Construct the prompt for AI
    const prompt = `You are an expert DSA (Data Structures and Algorithms) instructor creating quiz questions for computer science students.

Generate exactly ${count} multiple-choice questions about "${topic}" in Data Structures and Algorithms.

Difficulty level: ${difficulty}
- easy: Basic concepts, definitions, simple operations
- medium: Application of concepts, analyzing code, comparing approaches
- hard: Complex problems, optimization, edge cases, advanced analysis

Requirements:
1. Each question MUST have exactly 4 options labeled A, B, C, D
2. Exactly ONE option must be correct per question
3. Include a clear explanation for why the correct answer is right
4. Questions should test understanding, not just memorization
5. Vary question types: conceptual, code analysis, time/space complexity, practical applications
6. Make wrong options plausible but clearly incorrect upon careful analysis

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "questions": [
    {
      "question_text": "The complete question text here",
      "options": [
        { "text": "First option text", "is_correct": false },
        { "text": "Second option text", "is_correct": true },
        { "text": "Third option text", "is_correct": false },
        { "text": "Fourth option text", "is_correct": false }
      ],
      "explanation": "Clear explanation of why the correct answer is correct and why others are wrong"
    }
  ]
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let parsed: { questions: GeneratedQuestion[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate the response structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response format from AI");
    }

    // Validate each question has exactly one correct answer
    for (const q of parsed.questions) {
      const correctCount = q.options.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        // Fix: ensure exactly one correct answer
        q.options.forEach((o, i) => {
          o.is_correct = i === 0; // Default first to correct
        });
      }
    }

    return NextResponse.json({
      success: true,
      questions: parsed.questions,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to generate questions" 
      },
      { status: 500 }
    );
  }
}

