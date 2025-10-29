# AI PDF Tutor Setup Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud like Neon, Supabase, RDS)
- OpenAI API key
-(Optional) Google Gemini API key
-(Optional) Pinecone Vector DB account

## Setup Steps

### 1. Environment Configuration
Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string (use `sslmode=require` on most cloud providers)
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)

Optional (if using voice/Gemini and vector search):
- `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment (e.g. `us-east-1-aws`)
- `PINECONE_INDEX_NAME`: Index name (default: `ai-pdf-tutor`)

File handling (already defaulted in `env.example`):
- `UPLOAD_DIR`: Local upload directory (default `./uploads`)
- `MAX_FILE_SIZE`: Max upload size in bytes (default `10485760` ≈ 10MB)
- `APP_URL`: App base URL (default `http://localhost:3000`)

### 2. Database Setup
```bash
# Install dependencies
npm install

# Ensure DATABASE_URL is set to a Postgres instance
export DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require

# Create and run migrations locally (ensure Postgres is reachable)
npx prisma migrate dev --name init

# (Optional) Seed the database with a test user
npm run db:seed
```

### 2.1 (Optional) Pinecone Vector Index Setup
If you plan to enable vector-based search and chunk storage references, create/verify a Pinecone index:

```bash
# Requires PINECONE_API_KEY (and optionally PINECONE_INDEX_NAME) in .env.local
npm run setup:pinecone
```

### 3. Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Features Implemented

✅ **Authentication System**
- Email/password signup and login
- Secure password hashing with bcrypt
- Session management with NextAuth

✅ **PDF Upload & Management**
- Drag-and-drop PDF upload
- File validation and storage
- PDF metadata tracking

✅ **Split-Screen Interface**
- PDF viewer with page navigation
- Real-time chat interface
- Responsive design

✅ **AI Integration**
- OpenAI GPT-4 integration (via Vercel AI SDK)
- Optional Google Gemini key support for voice services
- PDF text extraction and analysis
- Context-aware responses

✅ **Chat System**
- Persistent chat history
- Message threading
- Real-time UI updates

✅ **Voice Controls**
- Web Speech API-based voice input and output
- Microphone and speaker controls
- Auto-speak toggle and compatibility checks

✅ **Vector-Ready Processing**
- PDF chunking with bounding boxes and metadata
- Message-to-relevant-chunk linkage
- Optional Pinecone vector database integration

## Production Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. In Vercel Project Settings → Environment Variables, set:
   - `DATABASE_URL` (Postgres URL; include `sslmode=require` if needed)
   - `OPENAI_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   - (Optional) `GOOGLE_GEMINI_API_KEY`
   - (Optional) `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME`
4. Deploy. The build will run `prisma migrate deploy` automatically.

If you see database connection errors during build or runtime:
- Verify `DATABASE_URL` is correct and accessible from Vercel
- Ensure the DB allows external connections and SSL settings match
- Check that migrations exist and the target database is empty/compatible

### Environment Variables for Production
- `DATABASE_URL`: Production PostgreSQL URL
- `OPENAI_API_KEY`: Production OpenAI key
- `NEXTAUTH_SECRET`: Production secret
- `NEXTAUTH_URL`: Production domain
- (Optional) `GOOGLE_GEMINI_API_KEY`
- (Optional) `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME`

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/upload` - PDF file upload
- `GET /api/pdfs/[id]` - Get PDF metadata
- `GET /api/pdfs/[id]/file` - Serve PDF file
- `POST /api/chat` - Chat with AI tutor
 - `POST /api/search` - Semantic search within PDF chunks
 - `GET /api/user/pdfs` - List user PDFs
 - `GET /api/user/chats` - List user chats

## Database Schema

The application uses the following main models:
- `User` - User accounts and authentication
- `PDF` - Uploaded PDF documents
- `Chat` - Chat sessions
- `Message` - Individual chat messages
 - `PDFChunk` - Extracted and indexed chunks of PDFs
 - `MessageRelevantChunk` - Join table linking messages to relevant chunks

## Next Steps for Enhancement

1. **PDF Annotation System** - Visual highlighting and annotations on the PDF canvas
2. **Advanced Voice Features** - Voice activity detection, multi-language, commands
3. **Vector Search UX** - Surfaces with filters, confidence scores, and navigation
4. **File Processing** - Add text extraction caching and background jobs
5. **User Management** - Profile management and settings
6. **Analytics** - Usage metrics and learning progress


