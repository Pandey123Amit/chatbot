import { NextRequest, NextResponse } from "next/server";
import { getAIResponse, getQuickResponse, ChatHistory } from "@/lib/ai-agent";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, chatHistory = [] } = body as {
      message: string;
      sessionId?: string;
      chatHistory?: ChatHistory[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check for quick responses first (greetings, thanks, etc.)
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      // Save AI message to session if sessionId provided
      if (sessionId) {
        await saveAIMessage(sessionId, message, quickResponse, false);
      }

      return NextResponse.json({
        response: quickResponse,
        shouldEscalate: false,
        isAI: true,
        confidence: 1,
        sources: [],
      });
    }

    // Get AI response using RAG
    const aiResponse = await getAIResponse(
      message,
      chatHistory,
      process.env.OPENAI_API_KEY
    );

    // Save AI message to session if sessionId provided
    if (sessionId) {
      await saveAIMessage(
        sessionId,
        message,
        aiResponse.response,
        aiResponse.shouldEscalate
      );
    }

    return NextResponse.json({
      response: aiResponse.response,
      shouldEscalate: aiResponse.shouldEscalate,
      escalationReason: aiResponse.escalationReason,
      isAI: true,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources,
      isSummary: aiResponse.isSummary,
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process message",
        response:
          "I apologize, but I'm having trouble right now. Let me connect you with a human agent.",
        shouldEscalate: true,
        isAI: true,
      },
      { status: 500 }
    );
  }
}

// Helper function to save AI messages to chat session
async function saveAIMessage(
  sessionId: string,
  userMessage: string,
  aiResponse: string,
  escalated: boolean
) {
  try {
    // Save user message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: userMessage,
        senderType: "CUSTOMER",
      },
    });

    // Save AI response
    await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: aiResponse,
        senderType: "SYSTEM", // Using SYSTEM for AI messages
      },
    });

    // If escalated, update session status to WAITING (for human agent)
    if (escalated) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: "WAITING" },
      });
    }
  } catch (error) {
    console.error("Error saving AI message:", error);
  }
}

// GET endpoint to check AI status
export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? "active" : "not_configured",
    message: hasApiKey
      ? "AI agent is ready"
      : "OpenAI API key not configured",
  });
}
