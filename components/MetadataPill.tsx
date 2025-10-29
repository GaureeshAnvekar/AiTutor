"use client";
import { MapPin, FileText, Image } from "lucide-react";

interface ChunkMetadata {
  pageNumber: number;
  text: string;
  similarity?: number;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  metadata?: any;
  type?: string; // "text" or "image"
}

interface MetadataPillProps {
  chunk: ChunkMetadata;
  onClick?: (chunk: ChunkMetadata, chunkId: string | undefined, totalRelevantChunks: number) => void;
  className?: string;
  chunkId?: string;
  totalRelevantChunks?: number;
}

export default function MetadataPill({ chunk, onClick, className = "", chunkId, totalRelevantChunks }: MetadataPillProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(chunk, chunkId, totalRelevantChunks || 0);
    }
  };

  // Truncate text to show preview
  const truncatedText = chunk.text.length > 50 
    ? `${chunk.text.substring(0, 50)}...` 
    : chunk.text;

  // Format similarity score as percentage
  const similarityPercentage = chunk.similarity 
    ? Math.round(chunk.similarity * 100) 
    : null;

  // Determine chunk type and appropriate icon
  const chunkType = chunk.type || chunk.metadata?.type || "text";
  const isImageChunk = chunkType === "image";
  const IconComponent = isImageChunk ? Image : FileText;

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 
        ${isImageChunk 
          ? 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300' 
          : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300'
        }
        border rounded-full text-xs 
        transition-all duration-200 
        cursor-pointer group
        ${className}
      `}
      title={`Click to navigate to page ${chunk.metadata.pageNumber}\n${chunk.text}`}
    >
      <div className="flex items-center gap-1.5">
        <MapPin className={`h-3 w-3 ${isImageChunk ? 'text-red-600' : 'text-blue-600'}`} />
        <span className={`font-medium ${isImageChunk ? 'text-red-700' : 'text-blue-700'}`}>
          Page {chunk.pageNumber}
        </span>
      </div>
      
      <div className={`flex items-center gap-1.5 border-l ${isImageChunk ? 'border-red-200' : 'border-blue-200'} pl-2`}>
        <IconComponent className={`h-3 w-3 ${isImageChunk ? 'text-red-500' : 'text-gray-500'}`} />
        <span className="text-gray-600 max-w-[120px] truncate">
          {truncatedText}
        </span>
      </div>

      {similarityPercentage && (
        <div className={`flex items-center gap-1 border-l ${isImageChunk ? 'border-red-200' : 'border-blue-200'} pl-2`}>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-600 font-medium">
            {similarityPercentage}%
          </span>
        </div>
      )}
    </button>
  );
}








