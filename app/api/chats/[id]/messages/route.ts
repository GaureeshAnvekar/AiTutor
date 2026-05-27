import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const { role, content, annotations } = await req.json();

    if (!role || !content) {
      return NextResponse.json({ error: "Role and content are required" }, { status: 400 });
    }

    if (role !== "assistant" && role !== "user") {
      return NextResponse.json({ error: "Invalid message role" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        role,
        content,
        annotations: annotations ? JSON.stringify(annotations) : undefined,
      },
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        annotations: message.annotations,
        timestamp: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating chat message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
