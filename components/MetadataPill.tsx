"use client";
import { MapPin, FileText } from "lucide-react";

interface ChunkMetadata {
  pageNumber: number;
  text: string;
  similarity?: number;
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
  metadata?: any;
}

interface MetadataPillProps {
  chunk: ChunkMetadata;
  onClick?: (chunk: ChunkMetadata, chunkId: string | undefined) => void;
  className?: string;
  chunkId?: string;
}

export default function MetadataPill({ chunk, onClick, className = "", chunkId }: MetadataPillProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(chunk, chunkId);
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

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 
        bg-blue-50 hover:bg-blue-100 
        border border-blue-200 hover:border-blue-300
        rounded-full text-xs 
        transition-all duration-200 
        cursor-pointer group
        ${className}
      `}
      title={`Click to navigate to page ${chunk.metadata.pageNumber}\n${chunk.text}`}
    >
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3 w-3 text-blue-600" />
        <span className="font-medium text-blue-700">
          Page {chunk.pageNumber}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 border-l border-blue-200 pl-2">
        <FileText className="h-3 w-3 text-gray-500" />
        <span className="text-gray-600 max-w-[120px] truncate">
          {truncatedText}
        </span>
      </div>

      {similarityPercentage && (
        <div className="flex items-center gap-1 border-l border-blue-200 pl-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-600 font-medium">
            {similarityPercentage}%
          </span>
        </div>
      )}
    </button>
  );
}




