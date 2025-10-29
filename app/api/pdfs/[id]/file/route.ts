import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { del } from "@vercel/blob";

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

    // Check if filePath is a URL (blob storage) or a filesystem path
    const isUrl = pdf.filePath.startsWith("http://") || pdf.filePath.startsWith("https://");
    
    let fileBuffer: Buffer;
    
    if (isUrl) {
      // Fetch from blob storage
      const response = await fetch(pdf.filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from blob storage: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // Read from filesystem (for backward compatibility)
      fileBuffer = await readFile(pdf.filePath);
    }

    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.originalName}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving PDF file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
