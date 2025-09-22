import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { searchSimilarChunks } from "@/lib/vector";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, pdfId, topK = 5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If pdfId is provided, verify the user owns the PDF
    if (pdfId) {
      const pdf = await prisma.pDF.findFirst({
        where: {
          id: pdfId,
          ownerId: user.id,
        },
      });

      if (!pdf) {
        return NextResponse.json({ error: "PDF not found or access denied" }, { status: 404 });
      }
    }

    // Search for similar chunks
    const similarChunks = await searchSimilarChunks(query, pdfId, topK);

    // Get full chunk details from database
    const chunkDetails = await Promise.all(
      similarChunks.map(async (chunk) => {
        const dbChunk = await prisma.pDFChunk.findUnique({
          where: {
            id: chunk.id,
          },
          include: {
            pdf: {
              select: {
                originalName: true,
                id: true,
              },
            },
          },
        });

        if (!dbChunk) {
          return null;
        }

        return {
          id: dbChunk.id,
          text: dbChunk.text,
          pageNumber: dbChunk.pageNumber,
          chunkIndex: dbChunk.chunkIndex,
          textLength: dbChunk.textLength,
          bbox: {
            x: dbChunk.bboxX,
            y: dbChunk.bboxY,
            width: dbChunk.bboxWidth,
            height: dbChunk.bboxHeight,
          },
          pdf: {
            id: dbChunk.pdf.id,
            name: dbChunk.pdf.originalName,
          },
          metadata: chunk.metadata,
        };
      })
    );

    // Filter out null results
    const validChunks = chunkDetails.filter(chunk => chunk !== null);

    return NextResponse.json({
      query,
      pdfId: pdfId || null,
      totalResults: validChunks.length,
      chunks: validChunks,
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


