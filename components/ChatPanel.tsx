"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  pdfId: string;
  currentPage: number;
}

export default function ChatPanel({ pdfId, currentPage }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          pdfId: pdfId,
          currentPage: currentPage,
          chatHistory: messages.slice(-10), // Send last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg font-medium mb-2">Welcome to your AI Tutor!</p>
            <p className="text-sm">Ask me anything about your PDF document.</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>Try asking:</p>
              <p>• "What is this document about?"</p>
              <p>• "Explain the main concepts"</p>
              <p>• "Find information about..."</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                <div className={`px-4 py-2 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-900"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
                <div className={`text-xs mt-1 ${msg.role === "user" ? "text-right text-gray-500" : "text-left text-gray-500"}`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">AI is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t p-4 bg-white flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question about the PDF..."
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <Send className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleVoiceInput}
          className={`p-2 rounded-lg ${
            isListening ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
          } hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isListening ? "Stop listening" : "Start voice input"}
          disabled={isLoading}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={handleVoiceOutput}
          className={`p-2 rounded-lg ${
            isSpeaking ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
          } hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isSpeaking ? "Stop speaking" : "Start voice output"}
          disabled={isLoading}
        >
          {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </form>
    </div>
  );
}