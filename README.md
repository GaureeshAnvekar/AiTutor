# AI PDF Tutor

An intelligent PDF tutoring application that helps students understand documents through interactive AI-powered conversations. Built with Next.js 14, Prisma, OpenAI, and modern web technologies.

## 🚀 Features

### ✅ Implemented
- **Complete Authentication System** - Email/password signup and login with NextAuth
- **PDF Upload & Management** - Drag-and-drop upload with file validation
- **Split-Screen Interface** - PDF viewer with real-time chat panel
- **AI-Powered Chat** - OpenAI GPT-4 integration with PDF context
- **Page Navigation** - AI can navigate to specific pages
- **Chat History** - Persistent conversation storage
- **Responsive Design** - Modern UI with Tailwind CSS
- **Voice Controls** - UI ready for voice input/output implementation
- PDF annotation and highlighting system
- Advanced voice integration
- Vector search within PDFs


## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4, Vercel AI SDK
- **Authentication**: NextAuth.js
- **File Handling**: PDF.js, React Dropzone
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Gemini API key

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd ai-pdf-tutor
npm install
```

### 2. Environment Setup
```bash
cp env.example .env.local
```

Fill in your `.env.local`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_pdf_tutor
OPENAI_API_KEY=sk-your-openai-key
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# (Optional) Seed with test data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` 🎉



## 🗄️ Database Schema






## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production
```env
DATABASE_URL=your-production-postgres-url
OPENAI_API_KEY=your-production-openai-key
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
```