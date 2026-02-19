import { NextRequest, NextResponse } from "next/server";
import { getAIResponse, getQuickResponse, ChatHistory } from "@/lib/ai-agent";
import { prisma } from "@/lib/db";
import { WEBSITE_VISITOR_EMAIL } from "@/lib/constants";
import { autoAssignChat } from "@/lib/auto-assign";
import { emitNewChatSession, emitChatMessage } from "@/lib/socket-handlers";

// Create a new AI chat session for anonymous website visitors
async function createAISession(): Promise<string> {
  const visitor = await prisma.user.findUnique({
    where: { email: WEBSITE_VISITOR_EMAIL },
  });

  if (!visitor) {
    throw new Error(
      "Sentinel user not found. Run prisma db seed to create it."
    );
  }

  const session = await prisma.chatSession.create({
    data: {
      customerId: visitor.id,
      status: "AI_ACTIVE",
      isAISession: true,
    },
  });

  return session.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatHistory = [] } = body as {
      message: string;
      sessionId?: string;
      chatHistory?: ChatHistory[];
    };
    let { sessionId } = body as { sessionId?: string };

    // Auto-create session on first message
    if (!sessionId) {
      sessionId = await createAISession();
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check for quick responses first (greetings, thanks, etc.)
    const quickResponse = getQuickResponse(message);
    if (quickResponse) {
      await saveAIMessage(sessionId, message, quickResponse, false);

      return NextResponse.json({
        response: quickResponse,
        shouldEscalate: false,
        isAI: true,
        confidence: 1,
        sources: [],
        sessionId,
      });
    }

    // Get AI response using RAG
    const aiResponse = await getAIResponse(
      message,
      chatHistory,
      process.env.OPENAI_API_KEY
    );

    await saveAIMessage(
      sessionId,
      message,
      aiResponse.response,
      aiResponse.shouldEscalate
    );

    // On escalation, try to auto-assign an agent
    if (aiResponse.shouldEscalate) {
      await handleEscalation(sessionId);
    }

    return NextResponse.json({
      response: aiResponse.response,
      shouldEscalate: aiResponse.shouldEscalate,
      escalationReason: aiResponse.escalationReason,
      isAI: true,
      confidence: aiResponse.confidence,
      sources: aiResponse.sources,
      sessionId,
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process message",
        response:
          "I apologize, but I'm having trouble right now. Please contact Amit directly at pandey.amit1598@gmail.com.",
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
        senderType: "SYSTEM",
      },
    });
  } catch (error) {
    console.error("Error saving AI message:", error);
  }
}

// Handle escalation: update status, auto-assign, notify agent
async function handleEscalation(sessionId: string) {
  try {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: "WAITING" },
    });

    const assignedSession = await autoAssignChat(sessionId);

    if (assignedSession?.agentId) {
      // Create system message about assignment
      const systemMsg = await prisma.chatMessage.create({
        data: {
          chatSessionId: sessionId,
          content: `${assignedSession.agent?.name} has been assigned to this conversation.`,
          senderType: "SYSTEM",
        },
      });

      // Notify the assigned agent via socket
      emitNewChatSession(assignedSession.agentId, assignedSession);
      emitChatMessage(sessionId, systemMsg);
    }
  } catch (error) {
    console.error("Error handling escalation:", error);
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
