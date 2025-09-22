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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pdf = await prisma.pDF.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pdf.id,
      filename: pdf.filename,
      originalName: pdf.originalName,
      filePath: pdf.filePath,
      fileSize: pdf.fileSize,
      pageCount: pdf.pageCount,
      createdAt: pdf.createdAt,
    });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


