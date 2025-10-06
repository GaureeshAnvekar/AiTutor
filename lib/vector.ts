import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI client
let openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Initialize Pinecone client
let pinecone: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set');
    }
    
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pinecone;
}

// Pinecone-based vector database
class PineconeVectorDB {
  private indexName: string;

  constructor() {
    this.indexName = process.env.PINECONE_INDEX_NAME || 'ai-pdf-tutor';
  }

  async initialize(): Promise<void> {
    const client = getPineconeClient();
    
    try {
      // Check if index exists
      const indexList = await client.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName);
      
      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await client.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        console.log('Waiting for index to be ready...');
        await this.waitForIndexReady();
      } else {
        console.log(`Pinecone index ${this.indexName} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw error;
    }
  }

  private async waitForIndexReady(): Promise<void> {
    const client = getPineconeClient();
    const maxRetries = 30;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const indexDescription = await client.describeIndex(this.indexName);
        if (indexDescription.status?.ready) {
          console.log(`Index ${this.indexName} is ready!`);
          return;
        }
        console.log(`Index not ready yet, waiting... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      } catch (error) {
        console.log(`Error checking index status: ${error}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      }
    }
    
    throw new Error(`Index ${this.indexName} did not become ready within ${maxRetries * 2} seconds`);
  }

  async upsert(chunks: ChunkEmbedding[]): Promise<void> {
    const client = getPineconeClient();
    const index = client.index(this.indexName);
    
    try {
      const vectors = chunks.map(chunk => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          pdfId: chunk.metadata.pdfId,
          pdfName: chunk.metadata.pdfName,
          pageNumber: chunk.metadata.pageNumber,
          chunkIndex: chunk.metadata.chunkIndex,
          textLength: chunk.metadata.textLength,
          bboxX: chunk.metadata.bboxX,
          bboxY: chunk.metadata.bboxY,
          bboxWidth: chunk.metadata.bboxWidth,
          bboxHeight: chunk.metadata.bboxHeight,
          createdAt: chunk.metadata.createdAt,
          text: chunk.text // Include text for easy access
        }
      }));

      await index.upsert(vectors);
      console.log(`Successfully upserted ${chunks.length} chunks to Pinecone`);
    } catch (error) {
      console.error('Error upserting to Pinecone:', error);
      throw error;
    }
  }

  async search(queryEmbedding: number[], pdfId?: string, topK: number = 2): Promise<ChunkEmbedding[]> {
    const client = getPineconeClient();
    const index = client.index(this.indexName);
    
    try {
      const searchRequest: any = {
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
        includeValues: false
      };

      // Add PDF filter if specified
      if (pdfId) {
        searchRequest.filter = {
          pdfId: { $eq: pdfId }
        };
      }

      const searchResponse = await index.query(searchRequest);
      
      const results: ChunkEmbedding[] = searchResponse.matches?.map(match => ({
        id: match.id,
        text: match.metadata?.text as string || '',
        embedding: queryEmbedding, // We don't store the original embedding in results
        metadata: {
          pdfId: match.metadata?.pdfId as string || '',
          pdfName: match.metadata?.pdfName as string || '',
          pageNumber: match.metadata?.pageNumber as number || 0,
          chunkIndex: match.metadata?.chunkIndex as number || 0,
          textLength: match.metadata?.textLength as number || 0,
          bboxX: match.metadata?.bboxX as number || 0,
          bboxY: match.metadata?.bboxY as number || 0,
          bboxWidth: match.metadata?.bboxWidth as number || 0,
          bboxHeight: match.metadata?.bboxHeight as number || 0,
          createdAt: match.metadata?.createdAt as string || '',
          similarity: match.score || 0
        }
      })) || [];

      return results;
    } catch (error) {
      console.error('Error searching Pinecone:', error);
      throw error;
    }
  }

  async deleteByPdfId(pdfId: string): Promise<void> {
    const client = getPineconeClient();
    const index = client.index(this.indexName);
    
    try {
      // Pinecone doesn't support filtering in delete operations
      // We need to query first to get the IDs, then delete
      const searchResponse = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000, // Large number to get all vectors
        filter: {
          pdfId: { $eq: pdfId }
        },
        includeMetadata: true,
        includeValues: false
      });

      if (searchResponse.matches && searchResponse.matches.length > 0) {
        const idsToDelete = searchResponse.matches.map(match => match.id);
        await index.deleteMany(idsToDelete);
        console.log(`Deleted ${idsToDelete.length} chunks for PDF ${pdfId} from Pinecone`);
      }
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
      throw error;
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    const client = getPineconeClient();
    const index = client.index(this.indexName);
    
    try {
      await index.deleteMany(ids);
      console.log(`Successfully deleted ${ids.length} chunks from Pinecone`);
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
      throw error;
    }
  }
}

// Global vector database instance
let vectorDB: PineconeVectorDB | null = null;

export async function getVectorDB(): Promise<PineconeVectorDB> {
  if (!vectorDB) {
    vectorDB = new PineconeVectorDB();
    await vectorDB.initialize();
  }
  return vectorDB;
}

export interface ChunkEmbedding {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    pdfId: string;
    pdfName: string;
    pageNumber: number;
    chunkIndex: number;
    textLength: number;
    bboxX: number;
    bboxY: number;
    bboxWidth: number;
    bboxHeight: number;
    createdAt: string;
    similarity?: number;
  };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Cost-effective embedding model
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function upsertChunksToVectorDB(chunks: ChunkEmbedding[]): Promise<void> {
  const vectorDB = await getVectorDB();
  
  try {
    await vectorDB.upsert(chunks);
    console.log(`Successfully upserted ${chunks.length} chunks to vector database`);
  } catch (error) {
    console.error('Error upserting to vector database:', error);
    throw new Error('Failed to upsert chunks to vector database');
  }
}

export async function searchSimilarChunks(
  query: string,
  pdfId?: string,
  topK: number = 5
): Promise<ChunkEmbedding[]> {
  const vectorDB = await getVectorDB();
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar chunks
    const results = await vectorDB.search(queryEmbedding, pdfId, topK);
    
    return results;
  } catch (error) {
    console.error('Error searching vector database:', error);
    throw new Error('Failed to search vector database');
  }
}

export async function deleteChunksFromVectorDB(chunkIds: string[]): Promise<void> {
  const vectorDB = await getVectorDB();
  
  try {
    await vectorDB.deleteByIds(chunkIds);
    console.log(`Successfully deleted ${chunkIds.length} chunks from vector database`);
  } catch (error) {
    console.error('Error deleting from vector database:', error);
    throw new Error('Failed to delete chunks from vector database');
  }
}

export async function deleteAllChunksForPDF(pdfId: string): Promise<void> {
  const vectorDB = await getVectorDB();
  
  try {
    await vectorDB.deleteByPdfId(pdfId);
    console.log(`Successfully deleted all chunks for PDF ${pdfId} from vector database`);
  } catch (error) {
    console.error('Error deleting PDF chunks from vector database:', error);
    throw new Error('Failed to delete PDF chunks from vector database');
  }
}