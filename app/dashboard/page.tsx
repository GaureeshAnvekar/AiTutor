"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Upload, FileText, MessageSquare, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      // Load user's PDFs and chats from the database
      const [pdfsResponse, chatsResponse] = await Promise.all([
        fetch("/api/user/pdfs"),
        fetch("/api/user/chats"),
      ]);

      if (pdfsResponse.ok) {
        const pdfsData = await pdfsResponse.json();
        setPdfs(pdfsData.pdfs);
      }

      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
        setChats(chatsData.chats);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseFileClick = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file only.");
      event.target.value = "";
      return;
    }

    // Enforce Vercel 4.5MB upload limit on the client
    const maxSizeBytes = Math.floor(4.5 * 1024 * 1024);
    if (file.size > maxSizeBytes) {
      setUploadError("Vercel only allows 4.5MB max");
      event.target.value = "";
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      // Simulate progress to give feedback
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      router.push(`/pdfs/${result.pdfId}`);
    } catch (err) {
      setUploadError("Upload failed. Please try again.");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
              Click below to choose a PDF and we’ll upload it right away
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              onClick={handleChooseFileClick}
              disabled={isUploading}
              className={`bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors ${
                isUploading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700"
              }`}
            >
              {isUploading ? "Uploading..." : "Choose PDF File"}
            </button>

            {isUploading && (
              <div className="mt-4 w-full max-w-md mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Uploading and processing your PDF...</p>
              </div>
            )}

            {uploadError && (
              <div className="mt-4 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {uploadError}
              </div>
            )}
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
                {pdfs.map((pdf) => (
                  <div key={pdf.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {pdf.originalName}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {(pdf.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {pdf.lastChat && (
                          <p className="text-xs text-blue-600 mt-1">
                            Last chat: {new Date(pdf.lastChat.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {pdf.lastChat ? (
                          <button
                            onClick={() => router.push(`/pdfs/${pdf.id}?chat=${pdf.lastChat.id}`)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Continue Chat
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/pdfs/${pdf.id}`)}
                            className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            Start Chat
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                {chats.map((chat) => (
                  <div key={chat.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {chat.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.pdfName} • {chat.messageCount} messages
                        </p>
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {chat.lastMessage.role === "user" ? "You: " : "AI: "}
                            {chat.lastMessage.content.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => router.push(`/pdfs/${chat.pdfId}?chat=${chat.id}`)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


