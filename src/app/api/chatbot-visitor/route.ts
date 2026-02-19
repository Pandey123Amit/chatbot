import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const visitor = await prisma.chatbotVisitor.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, visitorId: visitor.id });
  } catch (error) {
    console.error("Chatbot visitor error:", error);
    return NextResponse.json(
      { error: "Failed to register visitor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const visitors = await prisma.chatbotVisitor.findMany({
      orderBy: { visitedAt: "desc" },
    });

    return NextResponse.json({ visitors });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
