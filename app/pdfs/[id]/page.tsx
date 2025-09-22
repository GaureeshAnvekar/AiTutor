"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, MessageSquare, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import PDFViewer from "@/components/PDFViewer";
import ChatPanel from "@/components/ChatPanel";

interface PDFData {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  pageCount?: number;
}

export default function PDFPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadPDFData();
    }
  }, [session, params.id]);

  const loadPDFData = async () => {
    try {
      const response = await fetch(`/api/pdfs/${params.id}`);
      if (!response.ok) {
        throw new Error("PDF not found");
      }
      const data = await response.json();
      setPdfData(data);
      setTotalPages(data.pageCount || 1);
    } catch (error) {
      setError("Failed to load PDF");
      console.error("Error loading PDF:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input logic would go here
  };

  const handleVoiceOutput = () => {
    setIsSpeaking(!isSpeaking);
    // Voice output logic would go here
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !pdfData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">PDF Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {pdfData.originalName}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Voice Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-lg ${
                    isListening ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                  } hover:bg-gray-200 transition-colors`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleVoiceOutput}
                  className={`p-2 rounded-lg ${
                    isSpeaking ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  } hover:bg-gray-200 transition-colors`}
                  title={isSpeaking ? "Stop speaking" : "Start voice output"}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* PDF Viewer - Left Side */}
        <div className="flex-1 bg-white border-r">
          <div className="h-full flex flex-col">
            {/* PDF Controls */}
            <div className="border-b bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500">
                    {(pdfData.fileSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Display */}
            <div className="flex-1 overflow-auto p-4">
              <PDFViewer 
                url={`/api/pdfs/${params.id}/file`}
                page={currentPage}
                onPageChange={setCurrentPage}
                onTotalPages={setTotalPages}
              />
            </div>
          </div>
        </div>

        {/* Chat Panel - Right Side */}
        <div className="w-96 bg-white border-l">
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="border-b bg-gray-50 px-4 py-3">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">AI Tutor</h3>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ChatPanel 
                pdfId={params.id}
                currentPage={currentPage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}