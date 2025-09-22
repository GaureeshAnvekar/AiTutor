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

### 🔄 In Progress
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

## 📁 Project Structure

```
ai-pdf-tutor/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx        # User dashboard
│   ├── upload/page.tsx           # PDF upload page
│   ├── pdfs/[id]/page.tsx       # PDF viewer with chat
│   └── api/                     # API routes
│       ├── auth/[...nextauth]/   # NextAuth handlers
│       ├── auth/register/        # User registration
│       ├── upload/               # PDF upload
│       ├── pdfs/[id]/           # PDF management
│       └── chat/                # AI chat endpoint
├── components/                   # React components
│   ├── ChatPanel.tsx            # Chat interface
│   ├── PDFViewer.tsx           # PDF display
│   └── VoiceControls.tsx        # Voice controls
├── lib/                         # Utility libraries
│   ├── auth.ts                  # NextAuth configuration
│   ├── db.ts                   # Prisma client
│   ├── llm.ts                  # AI integration
│   ├── pdf.ts                  # PDF processing
│   └── vector.ts               # Vector search (future)
├── prisma/                     # Database schema
│   ├── schema.prisma
│   └── seed.ts
└── styles/                     # Global styles
    └── globals.css
```

## 🎯 Core User Flow

1. **Sign Up/Login** - Users create accounts with email/password
2. **Upload PDF** - Drag-and-drop PDF documents (up to 10MB)
3. **Start Chatting** - Ask questions about the PDF content
4. **AI Responses** - Get intelligent answers with page references
5. **Navigation** - AI can navigate to specific pages
6. **History** - All conversations are saved and accessible

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/upload` | PDF file upload |
| GET | `/api/pdfs/[id]` | Get PDF metadata |
| GET | `/api/pdfs/[id]/file` | Serve PDF file |
| POST | `/api/chat` | Chat with AI tutor |

## 🗄️ Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  pdfs      PDF[]
  chats     Chat[]
}

model PDF {
  id           String   @id @default(cuid())
  ownerId      String
  filename     String
  originalName String
  filePath     String
  fileSize     Int
  pageCount    Int?
  createdAt    DateTime @default(now())
  chats        Chat[]
}

model Chat {
  id        String    @id @default(cuid())
  userId    String
  pdfId     String?
  title     String
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Message {
  id          String   @id @default(cuid())
  chatId      String
  role        String
  content     String   @db.Text
  annotations Json?
  createdAt   DateTime @default(now())
}
```

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

## 🧪 Testing

Create a test user:
```bash
npm run db:seed
```

Login with:
- Email: `test@example.com`
- Password: `password123`

## 🔮 Future Enhancements

- **Visual PDF Annotations** - Highlight text and images on PDF canvas
- **Advanced Voice Integration** - Web Speech API for voice input/output
- **Vector Search** - Semantic search within PDF content
- **Multi-language Support** - Support for various languages
- **Collaborative Features** - Share PDFs and chat sessions
- **Analytics Dashboard** - Track learning progress and engagement

## 📝 License

This project is built for StudyFetch evaluation purposes.

## 🤝 Contributing

This is a demonstration project showcasing modern web development practices and AI integration capabilities.

---

**Built with ❤️ for StudyFetch**
