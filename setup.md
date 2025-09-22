# AI PDF Tutor Setup Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- OpenAI API key

## Setup Steps

### 1. Environment Configuration
Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)

### 2. Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
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
- OpenAI GPT-4 integration
- PDF text extraction and analysis
- Context-aware responses

✅ **Chat System**
- Persistent chat history
- Message threading
- Real-time UI updates

✅ **Voice Controls**
- Voice input/output UI (ready for implementation)
- Microphone and speaker controls

## Production Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
- `DATABASE_URL`: Production PostgreSQL URL
- `OPENAI_API_KEY`: Production OpenAI key
- `NEXTAUTH_SECRET`: Production secret
- `NEXTAUTH_URL`: Production domain

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/upload` - PDF file upload
- `GET /api/pdfs/[id]` - Get PDF metadata
- `GET /api/pdfs/[id]/file` - Serve PDF file
- `POST /api/chat` - Chat with AI tutor

## Database Schema

The application uses the following main models:
- `User` - User accounts and authentication
- `PDF` - Uploaded PDF documents
- `Chat` - Chat sessions
- `Message` - Individual chat messages

## Next Steps for Enhancement

1. **PDF Annotation System** - Implement visual highlighting on PDF canvas
2. **Voice Integration** - Add Web Speech API for voice input/output
3. **Vector Search** - Implement semantic search within PDFs
4. **File Processing** - Add PDF text extraction caching
5. **User Management** - Add profile management and settings
6. **Analytics** - Track usage and learning progress


