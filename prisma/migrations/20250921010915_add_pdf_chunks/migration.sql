-- CreateTable
CREATE TABLE "PDFChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pdfId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "bboxX" REAL NOT NULL,
    "bboxY" REAL NOT NULL,
    "bboxWidth" REAL NOT NULL,
    "bboxHeight" REAL NOT NULL,
    "textLength" INTEGER NOT NULL,
    "vectorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PDFChunk_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "PDF" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PDFChunk_pdfId_pageNumber_chunkIndex_key" ON "PDFChunk"("pdfId", "pageNumber", "chunkIndex");
