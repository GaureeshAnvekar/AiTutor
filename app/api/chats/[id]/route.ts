import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get chat with all messages
    const chat = await prisma.chat.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Ensure user owns this chat
      },
      include: {
        pdf: {
          select: {
            id: true,
            originalName: true,
            filename: true,
            pageCount: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" }, // Get messages in chronological order
          include: {
            relevantChunks: true,
          } as any,
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Transform messages for frontend
    const transformedMessages = (chat as any).messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
      annotations: message.annotations,
      relevantChunks: message.relevantChunks.map((chunk: any) => ({
        pageNumber: chunk.pageNumber,
        text: chunk.text,
        similarity: chunk.similarity,
        bboxX: chunk.bboxX,
        bboxY: chunk.bboxY,
        bboxWidth: chunk.bboxWidth,
        bboxHeight: chunk.bboxHeight,
        metadata: chunk.metadata ? JSON.parse(chunk.metadata) : null,
      })),
    }));

    return NextResponse.json({
      chat: {
        id: chat.id,
        title: chat.title,
        pdfId: chat.pdfId,
        pdfName: (chat as any).pdf?.originalName || "Unknown PDF",
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: transformedMessages,
      },
    });

  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
