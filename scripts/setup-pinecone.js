const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: '.env.local' });

async function setupPinecone() {
  try {
    console.log('Setting up Pinecone Vector Database...');
    
    // Validate environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not set in .env.local');
    }
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'ai-pdf-tutor';
    
    console.log(`Using Pinecone index: ${indexName}`);
    
    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    // Check if index exists
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName);
    
    if (indexExists) {
      console.log(`✅ Pinecone index "${indexName}" already exists`);
      
      // Get index stats
      const indexDescription = await pinecone.describeIndex(indexName);
      console.log(`Index status: ${indexDescription.status?.ready ? 'Ready' : 'Not Ready'}`);
      console.log(`Index dimension: ${indexDescription.dimension}`);
      console.log(`Index metric: ${indexDescription.metric}`);
      
      if (indexDescription.status?.ready) {
        const index = pinecone.index(indexName);
        const stats = await index.describeIndexStats();
        console.log(`Total vectors: ${stats.totalVectorCount || 0}`);
        console.log(`Index fullness: ${stats.indexFullness || 0}`);
      }
    } else {
      console.log(`Creating new Pinecone index: ${indexName}`);
      
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log(`✅ Pinecone index "${indexName}" created successfully!`);
      console.log('⏳ Waiting for index to be ready...');
      
      // Wait for index to be ready
      const maxRetries = 30;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const indexDescription = await pinecone.describeIndex(indexName);
          if (indexDescription.status?.ready) {
            console.log(`✅ Index "${indexName}" is ready!`);
            break;
          }
          console.log(`⏳ Index not ready yet, waiting... (${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        } catch (error) {
          console.log(`⚠️ Error checking index status: ${error}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries++;
        }
      }
      
      if (retries >= maxRetries) {
        throw new Error(`Index "${indexName}" did not become ready within ${maxRetries * 2} seconds`);
      }
    }
    
    console.log('\n🎉 Pinecone setup completed successfully!');
    console.log('📊 Features:');
    console.log('- High-performance vector search');
    console.log('- Cosine similarity matching');
    console.log('- PDF-based filtering');
    console.log('- Scalable cloud infrastructure');
    console.log('- Real-time indexing');
    
  } catch (error) {
    console.error('❌ Error setting up Pinecone:', error);
    process.exit(1);
  }
}

setupPinecone();


