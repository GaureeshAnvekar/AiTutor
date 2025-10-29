import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { 
  generateEmbedding, 
  upsertChunksToVectorDB, 
  ChunkEmbedding,
  deleteAllChunksForPDF,
  deleteAllChunksFromVectorDB 
} from "@/lib/vector";
import OpenAI from "openai";
import sharp from "sharp";

// Use pdfjs-dist for server-side PDF processing with bounding boxes
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

// Configure PDF.js for server-side usage without workers
// Completely disable worker for server-side processing
//pdfjsLib.GlobalWorkerOptions.workerSrc = '/Users/gaureesh/StudyFetch/AiTutor/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs';
//pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.CURR_ENV === 'DEV' ? '/Users/gaureesh/StudyFetch/AiTutor/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs' : '/pdfjs/pdf.worker.min.mjs';

/**
 * Convert image bytes to base64 string
 */
function imageBytesToBase64(imageBytes: Uint8Array | Buffer): string {
  if (imageBytes instanceof Buffer) {
    return imageBytes.toString('base64');
  } else {
    return Buffer.from(imageBytes).toString('base64');
  }
}

/**
 * Try to convert raw image data to PNG format if needed
 * This handles cases where PDF.js returns raw image data without headers
 */
async function convertRawImageToPNG(rawData: Uint8Array | Buffer, width: number, height: number): Promise<Uint8Array | null> {
  try {
    const bytes = rawData instanceof Buffer ? rawData : Buffer.from(rawData);

    // If it already looks like PNG or JPEG, skip
    if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return bytes;
    }
    if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return bytes;
    }
    const inferredChannels = Math.round(bytes.length / (width * height));

    // Must have dimensions to encode raw RGB(A)
    if (!width || !height) {
      console.warn("Width/height missing for raw image, skipping conversion");
      return null;
    }

    // Try to guess channels: pdf.js often gives RGBA
    return await sharp(bytes, { raw: { width, height, channels: inferredChannels as any } })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("Error converting raw image to PNG:", error);
    return null;
  }
}


/**
 * Detect image format from bytes with better validation
 */
function detectImageFormat(imageBytes: Uint8Array | Buffer): string {
  const bytes = imageBytes instanceof Buffer ? imageBytes : Buffer.from(imageBytes);
  
  // Log first few bytes for debugging
  console.log(`Image bytes length: ${bytes.length}, first 10 bytes:`, Array.from(bytes.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  
  // Check for common image format signatures
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    console.log('Detected JPEG format');
    return 'jpeg';
  } else if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    console.log('Detected PNG format');
    return 'png';
  } else if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    console.log('Detected GIF format');
    return 'gif';
  } else if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4D) {
    console.log('Detected BMP format');
    return 'bmp';
  } else if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    console.log('Detected WebP format');
    return 'webp';
  }
  
  // Check if it might be raw image data that needs conversion
  console.warn('Unknown image format, defaulting to PNG');
  return 'png';
}

/**
 * Send image to LLM for verbalization and get text description back
 */
async function verbalizeImage(imageBytes: Uint8Array | Buffer | null, width: number, height: number): Promise<string | null> {
  if (!imageBytes) {
    console.warn('No image bytes provided for verbalization');
    return null;
  }

  try {
    // Validate image bytes - at this point imageBytes is not null
    /*
    if (!(imageBytes as any instanceof Uint8Array || imageBytes as any instanceof Buffer)) {
      console.error('Invalid image bytes type:', typeof imageBytes);
      return null;
    }*/

    // Check minimum size (images should be at least a few bytes)
    if (imageBytes.length < 10) {
      console.warn('Image bytes too small, likely invalid:', imageBytes.length);
      return null;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Try to convert raw image data to proper format if needed
    let processedImageBytes: Uint8Array | Buffer = imageBytes;
    const convertedBytes = await convertRawImageToPNG(imageBytes, width, height);
    if (convertedBytes) {
      processedImageBytes = convertedBytes;
    } else {
      console.warn('Failed to process image data, using original');
    }
    
    // Convert image bytes to base64
    const base64Image = imageBytesToBase64(processedImageBytes);
    
    // Detect image format
    const imageFormat = detectImageFormat(processedImageBytes);
    
    // Validate that we have a supported format
    const supportedFormats = ['png', 'jpeg', 'gif', 'webp'];
    if (!supportedFormats.includes(imageFormat)) {
      console.error(`Unsupported image format detected: ${imageFormat}`);
      return null;
    }
    
    // Create data URL for the image
    const dataUrl = `data:image/${imageFormat};base64,${base64Image}`;
    
    console.log(`Sending image to OpenAI Vision API - Format: ${imageFormat}, Size: ${imageBytes.length} bytes, Base64 length: ${base64Image.length}`);

    // Send to OpenAI GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please describe this image in detail. Focus on any text, diagrams, charts, or visual elements that would be important for understanding the content. Be specific about any text you can read and any visual information that would be relevant for document analysis."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const description = response.choices[0]?.message?.content;
    
    if (description) {
      console.log(`Successfully verbalized image: ${description.substring(0, 100)}...`);
      return description;
    } else {
      console.warn('No description returned from OpenAI Vision API');
      return null;
    }

  } catch (error) {
    console.error('Error verbalizing image:', error);
    
    // Log additional details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('unsupported image')) {
        console.error('Image format validation failed. Image bytes info:', {
          length: imageBytes?.length,
          type: typeof imageBytes,
          isBuffer: imageBytes instanceof Buffer,
          isUint8Array: imageBytes instanceof Uint8Array,
          firstBytes: imageBytes ? Array.from(imageBytes.slice(0, 10)) : 'N/A'
        });
      }
    }
    
    return null;
  }
}

// Semantic chunking function with bounding box tracking
function chunkByLines(items: any[], maxChars = 500, lineGap = 5) {
  const chunks: { type: string, text: string; bbox: any }[] = [];
  let buffer = "";
  let bbox: any = null;
  let lastY: number | null = null;

  const flush = () => {
    if (buffer.trim().length > 0) {
      chunks.push({ type: "text", text: buffer.trim(), bbox });
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


/**
 * Create image chunks for images in a PDF page.
 */
export async function createImagesChunks(page: any) {
  const OPS = pdfjsLib.OPS;
  const opList = await page.getOperatorList();
  const results = [];

  const ctmStack = [];
  let currentTransform = [1, 0, 0, 1, 0, 0]; // identity matrix

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    switch (fn) {
      case OPS.save:
        ctmStack.push([...currentTransform]);
        break;

      case OPS.restore:
        currentTransform = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
        break;

      case OPS.transform:
        // multiply current transform matrix
        const m = args;
        currentTransform = multiplyTransform(currentTransform, m);
        break;

      case OPS.paintImageXObject: {
        const imageName = args[0];
        const bbox = getBBoxFromTransform(currentTransform);

        // We *try* to get the bytes, but this may fail if resources aren't loaded
        let imageBytes = null;
        let imageDescription = "";
        let pixelData = null;
        try {
          const {pixelData: extractedPixelData, width, height} = await getXObjectFromPage(page, imageName);
          pixelData = extractedPixelData;

          if (pixelData /*&& (pixelData instanceof Uint8Array || pixelData instanceof Buffer)*/) {
            console.log(`Processing image ${imageName} with ${pixelData.length} bytes`);
            imageDescription = (await verbalizeImage(pixelData, width, height)) ?? "";
            console.log(`Image description: ${imageDescription}`);
          } else {
            console.warn(`Skipping image ${imageName} - invalid data type or no data`);
          }
        } catch (e) {
          console.warn(`Failed to get image bytes for ${imageName}:`, e);
        }

        results.push({ type: "image", bbox, text: imageDescription });
        break;
      }

      case OPS.paintInlineImageXObject:
      case OPS.paintInlineImageXObjectGroup: {
        const bbox = getBBoxFromTransform(currentTransform);
        const img = args?.[0];
        let imageBytes = null;
        let imageDescription = "", width = 0, height = 0;
        
        try {
          // Try different ways to get the image data
          if (img?.imageData?.data) {
            imageBytes = img.imageData.data;
            width = img.imageData.width;
            height = img.imageData.height;
          } else if (img?.data) {
            imageBytes = img.data;
            width = img.width;
            height = img.height;
          } else if (img?.getBytes) {
            imageBytes = img.getBytes();
            width = img.width;
            height = img.height;
          }

          if (imageBytes /*&& (imageBytes instanceof Uint8Array || imageBytes instanceof Buffer)*/) {
            console.log(`Processing inline image with ${imageBytes.length} bytes`);
            imageDescription = (await verbalizeImage(imageBytes, width, height)) ?? "";
          } else {
            console.warn(`Skipping inline image - invalid data type or no data`);
          }
        } catch (e) {
          console.warn(`Failed to get inline image bytes:`, e);
        }
        
        results.push({ type: "image", bbox, text: imageDescription });
        break;
      }

      default:
        break;
    }
  }

  return results;
}

/**
 * Try to get image XObject bytes if available
 */
async function getXObjectFromPage(page: any, name: any): Promise<any> {
  try {
    // PDF.js loads objects asynchronously, so we need to wait for them
    // The get method can take a callback to wait for resolution
    
    return new Promise((resolve) => {
      let resolved = false;
      
      // Try common objects first (for shared objects starting with "g_")
      if (name.startsWith("g_")) {
        page.commonObjs.get(name, (imageObj: any) => {
          if (!resolved && imageObj) {
            resolved = true;
            resolve(extractImageData(imageObj, name));
          }
        });
      } else {
        // Try page objects
        page.objs.get(name, (imageObj: any) => {
          if (!resolved && imageObj) {
            resolved = true;
            resolve(extractImageData(imageObj, name));
          }
        });
      }
      
      // Fallback: try both regardless of name prefix
      setTimeout(() => {
        if (!resolved) {
          // Try commonObjs
          page.commonObjs.get(name, (imageObj: any) => {
            if (!resolved && imageObj) {
              resolved = true;
              resolve(extractImageData(imageObj, name));
            }
          });
          
          // Try objs
          page.objs.get(name, (imageObj: any) => {
            if (!resolved && imageObj) {
              resolved = true;
              resolve(extractImageData(imageObj, name));
            }
          });
          
          // Final timeout
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          }, 1000);
        }
      }, 100);
    });
    
  } catch (error) {
    console.warn(`Failed to get XObject ${name}:`, error);
    return null;
  }
}

/**
 * Extract image data from an image object
 */
function extractImageData(imageObj: any, name: string): any {
  try {
    // The image object should have the raw data
    if (imageObj.data) {
      return {pixelData: imageObj.data, width: imageObj.width, height: imageObj.height};
    }
    // Some objects might have imageData property
    if (imageObj.imageData && imageObj.imageData.data) {
      return {pixelData: imageObj.imageData.data, width: imageObj.imageData.width, height: imageObj.imageData.height};
    }
    // Try getImageData method if available
    if (imageObj.getImageData) {
      try {
        const imageData = imageObj.getImageData();
        if (imageData && imageData.data) {
          return {pixelData: imageData.data, width: imageData.width, height: imageData.height};
        }
      } catch (e) {
        console.warn(`Failed to get image data for ${name}:`, e);
      }
    }
    return null;
  } catch (error) {
    console.warn(`Failed to extract image data for ${name}:`, error);
    return null;
  }
}

/**
 * Combine two 3x2 transform matrices
 */
function multiplyTransform(m1: any, m2: any) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/**
 * Derive bounding box (axis-aligned) from transform
 */
function getBBoxFromTransform(transform: any) {
  const [a, b, c, d, e, f] = transform;
  const width = Math.sqrt(a * a + c * c);
  const height = Math.sqrt(b * b + d * d);
  return { x: e, y: f, width, height };
}



export interface ChunkingResult {
  success: boolean;
  totalChunks: number;
  totalPages: number;
  error?: string;
}

export async function extractAndSaveChunks(pdfId: string): Promise<ChunkingResult> {
  try {
    const OPS = pdfjsLib.OPS;
    //await deleteAllChunksFromVectorDB(); // remove this later
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
    let allChunks: { type: string,page: number; text: string; bbox: any }[] = [];
    let pdfDoc: any;
    
    try {
      let pdfBuffer: Buffer;
      
      // Check if filePath is a URL (blob storage) or a filesystem path
      const isUrl = pdf.filePath.startsWith("http://") || pdf.filePath.startsWith("https://");
      
      if (isUrl) {
        // Fetch from blob storage or URL
        console.log(`Fetching PDF from URL: ${pdf.filePath}`);
        const response = await fetch(pdf.filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF from blob storage: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
      } else {
        // Read from filesystem (for backward compatibility)
        const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
        const fallbackUploadDir = process.env.UPLOAD_DIR || (isVercel ? "/tmp/uploads" : "./uploads");
        const fallbackPath = path.isAbsolute(fallbackUploadDir)
          ? path.join(fallbackUploadDir, `${pdfId}.pdf`)
          : path.join(process.cwd(), fallbackUploadDir, `${pdfId}.pdf`);
        const filePath = pdf.filePath && pdf.filePath.length > 0 ? pdf.filePath : fallbackPath;
        pdfBuffer = await fs.readFile(filePath);
      }
      
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

        const imageChunks = await createImagesChunks(page);
        
        // Use semantic chunking function that preserves bounding boxes
        const chunks = chunkByLines(textContent.items, 500);
        chunks.forEach(chunk => allChunks.push({ ...chunk, page: i }));
        imageChunks.forEach(chunk => allChunks.push({ ...chunk, page: i }));
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
              updatedAt: new Date(),
              type: chunk.type,
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
              vectorId: embedding.length > 0 ? chunkId : null,
              type: chunk.type,
            }
          });
          
          return {
            ...savedChunk,
            embedding,
            bbox: chunk.bbox,
            type: chunk.type,
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
            type: chunk.type, // Include type field
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
