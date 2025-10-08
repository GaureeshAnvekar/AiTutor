import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { searchSimilarChunks } from "@/lib/vector";

// PDF processing is now handled by the pdf-chunking utility

// Function to sanitize chunk text using OpenAI
async function sanitizeChunkText(originalQuery: string, chunkText: string, openai: OpenAI): Promise<string> {
  try {
    const sanitizationPrompt = `For this original query: "${originalQuery}"

This was the chunk text received:
${chunkText}

I want you to extract only the relevant text as it is without changing any format. Return only the relevant portions that relate to the original query, maintaining the exact original formatting and wording. Do not remove parts in between. Remove parts only at the very beginning or at the end.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a text extraction assistant. Extract only the relevant portions of the provided text that relate to the user's query, maintaining exact formatting and wording. Do not paraphrase or change the text - only extract the relevant parts. If there are parts in between that seem irrelevant - DO NOT REMOVE THEM. If entire text is irrelevant, add the word BAD to your response."
        },
        {
          role: "user",
          content: sanitizationPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    return completion.choices[0]?.message?.content || chunkText;
  } catch (error) {
    console.error("Error sanitizing chunk text:", error);
    return chunkText; // Return original text if sanitization fails
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { message, pdfId, currentPage, chatHistory } = await req.json();

    if (!message || !pdfId) {
      return NextResponse.json({ error: "Message and PDF ID are required" }, { status: 400 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get PDF data
    const pdf = await prisma.pDF.findUnique({
      where: { id: pdfId },
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Initialize OpenAI client early for potential chunk sanitization
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use semantic search to find relevant chunks
    let pdfText = "";
    let relevantChunks: any[] = [];
    let searchResults: any[] = [];
    
    try {
      // Search for chunks relevant to the user's message
      searchResults = await searchSimilarChunks(message, pdfId, 5);
      
      // Sanitize chunk text using OpenAI if we have search results
      if (searchResults.length > 0) {
        console.log(`Sanitizing ${searchResults.length} chunks for query: "${message}"`);
        
        // Sanitize each chunk's text
        const sanitizedResults = await Promise.all(
          searchResults.map(async (chunk) => {
            const sanitizedText = await sanitizeChunkText(message, chunk.text, openai);
            return {
              ...chunk,
              text: sanitizedText
            };
          })
        );
        
        searchResults = sanitizedResults.filter(chunk => chunk.text !== "BAD");
        console.log("Chunk sanitization completed");
      }
      
      // Get full chunk details from database
      /*
      relevantChunks = await Promise.all(
        searchResults.map(async (chunk) => {
          const dbChunk = await prisma.pDFChunk.findUnique({
            where: {
              id: chunk.id,
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
            bbox: {
              x: dbChunk.bboxX,
              y: dbChunk.bboxY,
              width: dbChunk.bboxWidth,
              height: dbChunk.bboxHeight,
            },
            metadata: chunk.metadata,
          };
        })
      );*/

      // Filter out null results
      //relevantChunks = relevantChunks.filter(chunk => chunk !== null);
      
      // Create context from relevant chunks (now with sanitized text)
      const contextText = searchResults.map(chunk => 
        `Page ${chunk.metadata.pageNumber}: ${chunk.text}`
      ).join('\n\n');
      
      pdfText = `PDF Document: ${pdf.originalName}
Relevant Context (from semantic search):
${contextText}

Note: This response is based on the most relevant sections of the PDF that match your question.`;
        
      console.log(`Found ${searchResults.length} relevant chunks for query: "${message}"`);
      
    } catch (error) {
      console.error("Error performing semantic search:", error);
      pdfText = `PDF Document: ${pdf.originalName}\nNote: Unable to perform semantic search. Please ensure the PDF has been processed for chunking first.`;
    }

    // Create or get chat session
    let chat = await prisma.chat.findFirst({
      where: {
        userId: user.id,
        pdfId: pdfId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userId: user.id,
          pdfId: pdfId,
          title: `Chat about ${pdf.originalName}`,
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: message,
      },
    });

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI assistant specialized in tutoring students on PDF documents. Your goal is to help the user understand the provided PDF content.

        PDF Information:
        ${pdfText}
        
        The user is currently viewing page ${currentPage} of the PDF: ${pdf.originalName}
        
        Please provide helpful explanations, answer questions, and guide the user through understanding the document content.
        Be conversational and educational in your responses. You can now see the actual PDF content, so you can answer specific questions about the document text, summarize sections, explain concepts, and help the user understand the material.`,
      },
      ...chatHistory.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Save AI response
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: aiResponse,
      },
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      text: aiResponse,
      relevantChunks: searchResults,//relevantChunks, // Include relevant chunks found by semantic search
      metadata: {
        pdfId: pdfId,
        totalRelevantChunks: relevantChunks.length,
        totalPages: pdf?.pageCount || 0,
        searchQuery: message
      }
    });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}