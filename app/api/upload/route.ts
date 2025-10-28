import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import { extractAndSaveChunks } from "@/lib/pdf-chunking";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database to get the actual user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    /*
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }*/

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileId = uuidv4();
    const fileName = `${fileId}.pdf`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save to database
    const pdf = await prisma.pDF.create({
      data: {
        id: fileId,
        ownerId: user.id,
        filename: fileName,
        originalName: file.name,
        filePath: filePath,
        fileSize: file.size,
      }
    });

    // Automatically chunk the PDF after upload
    try {
      console.log(`Starting automatic chunking for PDF: ${pdf.id}`);
      const chunkingResult = await extractAndSaveChunks(pdf.id);
      
      if (chunkingResult.success) {
        console.log(`Successfully chunked PDF ${pdf.id}: ${chunkingResult.totalChunks} chunks created`);
      } else {
        console.error(`Failed to chunk PDF ${pdf.id}:`, chunkingResult.error);
      }
    } catch (chunkingError) {
      console.error(`Error during automatic chunking for PDF ${pdf.id}:`, chunkingError);
      // Don't fail the upload if chunking fails
    }

    return NextResponse.json({
      success: true,
      pdfId: pdf.id,
      message: "File uploaded successfully and is being processed for AI chat"
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
