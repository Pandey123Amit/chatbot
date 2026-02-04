import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rebuildVectorStore } from "@/lib/ai-agent";

// POST /api/ai-chat/rebuild - Rebuild the vector store (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admins to rebuild vector store
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const success = await rebuildVectorStore(apiKey);

    if (success) {
      return NextResponse.json({
        message: "Vector store rebuilt successfully",
        status: "success",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to rebuild vector store" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error rebuilding vector store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
