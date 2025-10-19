import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's chats with PDF information and message counts
    const chats = await prisma.chat.findMany({
      where: { userId: user.id },
      include: {
        pdf: {
          select: {
            id: true,
            originalName: true,
            filename: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get the last message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform the data for frontend consumption
    const transformedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      pdfId: chat.pdfId,
      pdfName: chat.pdf?.originalName || "Unknown PDF",
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat._count.messages,
      lastMessage: chat.messages[0] ? {
        content: chat.messages[0].content,
        role: chat.messages[0].role,
        createdAt: chat.messages[0].createdAt,
      } : null,
    }));

    return NextResponse.json({ chats: transformedChats });

  } catch (error) {
    console.error("Error fetching user chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
