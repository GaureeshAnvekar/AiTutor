"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Upload, FileText, MessageSquare, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      // Load user's PDFs and chats
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      // This would load user's PDFs and chats from the database
      // For now, we'll use placeholder data
      setPdfs([]);
      setChats([]);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">AI PDF Tutor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{session.user?.name || session.user?.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome back, {session.user?.name || "Student"}!
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Upload a PDF to start learning with your AI tutor
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="text-center">
            <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload a PDF Document
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your PDF file here, or click to browse
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose PDF File
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent PDFs */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Recent PDFs</h3>
            </div>
            {pdfs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No PDFs uploaded yet. Upload your first document to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {/* PDF list would go here */}
              </div>
            )}
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Chats</h3>
            </div>
            {chats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No conversations yet. Start chatting with your AI tutor!
              </p>
            ) : (
              <div className="space-y-3">
                {/* Chat list would go here */}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


