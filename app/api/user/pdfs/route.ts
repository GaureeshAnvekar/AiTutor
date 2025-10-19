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

    // Get user's PDFs with their associated chats
    const pdfs = await prisma.pDF.findMany({
      where: { ownerId: user.id },
      include: {
        chats: {
          orderBy: { updatedAt: "desc" },
          take: 1, // Get the most recent chat for each PDF
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1, // Get the last message for preview
            },
          },
        },
        _count: {
          select: {
            chats: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform the data for frontend consumption
    const transformedPdfs = pdfs.map(pdf => ({
      id: pdf.id,
      filename: pdf.filename,
      originalName: pdf.originalName,
      fileSize: pdf.fileSize,
      pageCount: pdf.pageCount,
      createdAt: pdf.createdAt,
      updatedAt: pdf.updatedAt,
      chatCount: pdf._count.chats,
      lastChat: pdf.chats[0] ? {
        id: pdf.chats[0].id,
        title: pdf.chats[0].title,
        updatedAt: pdf.chats[0].updatedAt,
        lastMessage: pdf.chats[0].messages[0] ? {
          content: pdf.chats[0].messages[0].content,
          role: pdf.chats[0].messages[0].role,
          createdAt: pdf.chats[0].messages[0].createdAt,
        } : null,
      } : null,
    }));

    return NextResponse.json({ pdfs: transformedPdfs });

  } catch (error) {
    console.error("Error fetching user PDFs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
