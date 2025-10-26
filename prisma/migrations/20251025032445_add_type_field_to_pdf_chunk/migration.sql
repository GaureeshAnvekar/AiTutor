/*
  Warnings:

  - Added the required column `type` to the `PDFChunk` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PDFChunk" (
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
    "type" TEXT NOT NULL,
    CONSTRAINT "PDFChunk_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "PDF" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PDFChunk" ("bboxHeight", "bboxWidth", "bboxX", "bboxY", "chunkIndex", "createdAt", "id", "pageNumber", "pdfId", "text", "textLength", "updatedAt", "vectorId") SELECT "bboxHeight", "bboxWidth", "bboxX", "bboxY", "chunkIndex", "createdAt", "id", "pageNumber", "pdfId", "text", "textLength", "updatedAt", "vectorId" FROM "PDFChunk";
DROP TABLE "PDFChunk";
ALTER TABLE "new_PDFChunk" RENAME TO "PDFChunk";
CREATE UNIQUE INDEX "PDFChunk_pdfId_pageNumber_chunkIndex_key" ON "PDFChunk"("pdfId", "pageNumber", "chunkIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
