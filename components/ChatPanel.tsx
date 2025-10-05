"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { eventDispatcher, EVENTS } from "@/lib/eventDispatcher";
import MetadataPill from "./MetadataPill";
import VoiceControls, { VoiceControlsRef } from "./VoiceControls";
import BrowserCompatibility from "./BrowserCompatibility";

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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relevantChunks?: ChunkMetadata[];
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
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceControlsRef = useRef<VoiceControlsRef>(null);

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
        relevantChunks: data.relevantChunks || [],
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak the AI response if enabled
      if (autoSpeak && voiceControlsRef.current) {
        // Add a small delay to ensure the component is ready
        setTimeout(() => {
          if (voiceControlsRef.current) {
            voiceControlsRef.current.handleStartSpeaking(assistantMessage.content);
          }
        }, 100);
      }

      // Dispatch metadata to PDFViewer
      /*if (data.relevantChunks || data.metadata) {
        eventDispatcher.dispatch(EVENTS.CHAT_METADATA_RECEIVED, {
          relevantChunks: data.relevantChunks,
          metadata: data.metadata,
          searchQuery: userMessage.content,
          timestamp: new Date(),
        });
      }*/
      
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

  const handleVoiceInput = (transcript: string) => {
    // Set the transcript as the message and send it
    setMessage(transcript);
    // Automatically send the voice input as a message
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  const handleVoiceOutput = (text: string) => {
    // Voice output is handled by the VoiceControls component
    console.log('Voice output completed:', text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePillClick = (chunk: ChunkMetadata) => {
    // Dispatch event to navigate to the specific chunk
    console.log("The chunk is: ", chunk);
    eventDispatcher.dispatch(EVENTS.CHAT_METADATA_RECEIVED, {
      relevantChunks: [chunk],
      metadata: {
        pdfId: pdfId,
        totalRelevantChunks: 1,
        searchQuery: `Navigate to page ${chunk.pageNumber}`,
        pageNumber: chunk.metadata.pageNumber,
      },
      timestamp: new Date(),
    });
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
                  
                  {/* Voice output button for assistant messages */}
                  {msg.role === "assistant" && voiceSupported && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          if (voiceControlsRef.current) {
                            voiceControlsRef.current.handleStartSpeaking(msg.content);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        disabled={isLoading}
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Speak Response</span>
                      </button>
                    </div>
                  )}

                  {/* Show metadata pills for assistant messages with relevant chunks */}
                  {msg.role === "assistant" && msg.relevantChunks && msg.relevantChunks.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Related sections:</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.relevantChunks.map((chunk, index) => (
                          <MetadataPill
                            key={`${msg.id}-chunk-${index}`}
                            chunk={chunk}
                            onClick={handlePillClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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

      {/* Browser compatibility check */}
      <BrowserCompatibility onCompatibilityChange={setVoiceSupported} />

      {/* Auto-speak toggle */}
      {voiceSupported && (
        <div className="border-t p-2 bg-gray-50 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded"
            />
            <span>Auto-speak AI responses</span>
          </label>
        </div>
      )}

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
        {voiceSupported && (
          <VoiceControls
            ref={voiceControlsRef}
            onVoiceInput={handleVoiceInput}
            onVoiceOutput={handleVoiceOutput}
            disabled={isLoading}
          />
        )}
      </form>
    </div>
  );
}