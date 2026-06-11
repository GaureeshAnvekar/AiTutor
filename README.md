# AI PDF Tutor

Turn static textbooks into interactive PDFs for high schoolers & graduate students, through an interactive split-screen interface - voice support, section highlighting, image search, and visual explanations.

[https://aitutor.wiki](https://aitutor.wiki)

Video demo (with audio):
[Watch the demo video](https://drive.google.com/file/d/1b-dyAQXqFaI8lSWq3EZNuQktXfwnhuqC/view)

Note: For large pdfs with multiple high-res images, the upload process can be further improved with parallel workers on the backend, processing different pages of the pdf in parallel and initiating the "image verbalization LLM requests".

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
- Visual explanations

## Quick Start

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

Visit `http://localhost:3000`