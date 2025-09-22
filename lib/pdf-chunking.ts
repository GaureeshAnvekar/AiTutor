import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { 
  generateEmbedding, 
  upsertChunksToVectorDB, 
  ChunkEmbedding,
  deleteAllChunksForPDF 
} from "@/lib/vector";

// Use pdfjs-dist for server-side PDF processing with bounding boxes
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

// Configure PDF.js for server-side usage without workers
// Completely disable worker for server-side processing
pdfjsLib.GlobalWorkerOptions.workerSrc = '/Users/gaureesh/StudyFetch/AiTutor/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs';

// Semantic chunking function with bounding box tracking
function chunkByLines(items: any[], maxChars = 500, lineGap = 5) {
  const chunks: { text: string; bbox: any }[] = [];
  let buffer = "";
  let bbox: any = null;
  let lastY: number | null = null;

  const flush = () => {
    if (buffer.trim().length > 0) {
      chunks.push({ text: buffer.trim(), bbox });
      buffer = "";
      bbox = null;
    }
  };

  items.forEach(item => {
    const [a, b, c, d, e, f] = item.transform;
    const fontHeight = Math.sqrt(b * b + d * d);
    const currentBbox = { x: e, y: f, width: item.width, height: fontHeight };

    if (!bbox) bbox = { ...currentBbox };
    else {
      bbox.x = Math.min(bbox.x, currentBbox.x);
      bbox.y = Math.min(bbox.y, currentBbox.y);
      bbox.width = Math.max(bbox.width, currentBbox.x + currentBbox.width - bbox.x);
      bbox.height = Math.max(bbox.height, currentBbox.y + currentBbox.height - bbox.y);
    }

    if (lastY !== null && Math.abs(f - lastY) > lineGap) buffer += "\n";
    lastY = f;

    buffer += item.str;

    if (buffer.length >= maxChars) flush();
  });

  flush();
  return chunks;
}

export interface ChunkingResult {
  success: boolean;
  totalChunks: number;
  totalPages: number;
  error?: string;
}

export async function extractAndSaveChunks(pdfId: string): Promise<ChunkingResult> {
  try {
    // Get PDF metadata from database
    const pdf = await prisma.pDF.findUnique({
      where: { id: pdfId },
    });

    if (!pdf) {
      return {
        success: false,
        totalChunks: 0,
        totalPages: 0,
        error: "PDF not found"
      };
    }

    // Extract text chunks with bounding boxes using pdfjs-dist
    let allChunks: { page: number; text: string; bbox: any }[] = [];
    let pdfDoc: any;
    
    try {
      const uploadDir = process.env.UPLOAD_DIR || "./uploads";
      const filePath = path.join(process.cwd(), uploadDir, `${pdfId}.pdf`);
      
      // Read PDF file
      const pdfBuffer = await fs.readFile(filePath);
      
      // Convert Buffer to Uint8Array for PDF.js
      const uint8Array = new Uint8Array(pdfBuffer);
      
      // Load PDF document using PDF.js (with bounding box support)
      const loadingTask = pdfjsLib.getDocument({ 
        data: uint8Array,
        useWorkerFetch: false, // Disable worker fetch for server-side
        disableWorker: true    // Explicitly disable worker
      });
      pdfDoc = await loadingTask.promise;
      
      // Extract chunks from all pages with bounding boxes
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        // Use semantic chunking function that preserves bounding boxes
        const chunks = chunkByLines(textContent.items, 500);
        chunks.forEach(chunk => allChunks.push({ ...chunk, page: i }));
      }
      
      console.log(`Extracted ${allChunks.length} chunks from PDF ${pdfId}`);
      
      // Delete existing chunks for this PDF from vector database
      try {
        await deleteAllChunksForPDF(pdfId);
        console.log(`Deleted existing chunks for PDF ${pdfId} from vector database`);
      } catch (error) {
        console.warn(`Warning: Could not delete existing chunks from vector database:`, error);
      }
      
      // Save chunks to database and generate embeddings
      const savedChunks = await Promise.all(
        allChunks.map(async (chunk, index) => {
          const chunkId = `${pdfId}-${chunk.page}-${index}`;
          
          // Generate embedding for the chunk
          let embedding: number[] = [];
          try {
            embedding = await generateEmbedding(chunk.text);
            console.log(`Generated embedding for chunk ${chunkId}`);
          } catch (error) {
            console.error(`Failed to generate embedding for chunk ${chunkId}:`, error);
          }
          
          // Save to database
          const savedChunk = await prisma.pDFChunk.upsert({
            where: {
              pdfId_pageNumber_chunkIndex: {
                pdfId: pdfId,
                pageNumber: chunk.page,
                chunkIndex: index
              }
            },
            update: {
              text: chunk.text,
              bboxX: chunk.bbox.x,
              bboxY: chunk.bbox.y,
              bboxWidth: chunk.bbox.width,
              bboxHeight: chunk.bbox.height,
              textLength: chunk.text.length,
              vectorId: embedding.length > 0 ? chunkId : null,
              updatedAt: new Date()
            },
            create: {
              pdfId: pdfId,
              pageNumber: chunk.page,
              chunkIndex: index,
              text: chunk.text,
              bboxX: chunk.bbox.x,
              bboxY: chunk.bbox.y,
              bboxWidth: chunk.bbox.width,
              bboxHeight: chunk.bbox.height,
              textLength: chunk.text.length,
              vectorId: embedding.length > 0 ? chunkId : null
            }
          });
          
          return {
            ...savedChunk,
            embedding,
            bbox: chunk.bbox
          };
        })
      );
      
      console.log(`Saved ${savedChunks.length} chunks to database`);
      
      // Prepare chunks for vector database
      const chunksForVectorDB: ChunkEmbedding[] = savedChunks
        .filter(chunk => chunk.embedding.length > 0)
        .map(chunk => ({
          id: `${pdfId}-${chunk.pageNumber}-${chunk.chunkIndex}`,
          text: chunk.text,
          embedding: chunk.embedding,
          metadata: {
            pdfId: pdfId,
            pdfName: pdf.originalName,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            textLength: chunk.textLength,
            bboxX: chunk.bboxX,
            bboxY: chunk.bboxY,
            bboxWidth: chunk.bboxWidth,
            bboxHeight: chunk.bboxHeight,
            createdAt: chunk.createdAt.toISOString(),
          }
        }));
      
      // Upsert to vector database
      if (chunksForVectorDB.length > 0) {
        try {
          await upsertChunksToVectorDB(chunksForVectorDB);
          console.log(`Successfully upserted ${chunksForVectorDB.length} chunks to vector database`);
        } catch (error) {
          console.error(`Failed to upsert chunks to vector database:`, error);
          // Don't fail the entire operation if vector DB fails
        }
      }
      
    } catch (error) {
      console.error("Error extracting PDF chunks:", error);
      return {
        success: false,
        totalChunks: 0,
        totalPages: 0,
        error: "Failed to extract PDF chunks"
      };
    }

    return {
      success: true,
      totalChunks: allChunks.length,
      totalPages: pdfDoc.numPages
    };

  } catch (error) {
    console.error("Chunks extraction error:", error);
    return {
      success: false,
      totalChunks: 0,
      totalPages: 0,
      error: "Internal server error"
    };
  }
}
