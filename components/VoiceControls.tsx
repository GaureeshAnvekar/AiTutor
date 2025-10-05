"use client";
import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { WebSpeechService } from "@/lib/voiceService";

interface VoiceControlsProps {
  onVoiceInput?: (text: string) => void;
  onVoiceOutput?: (text: string) => void;
  disabled?: boolean;
}

export interface VoiceControlsRef {
  handleStartSpeaking: (text: string) => Promise<void>;
  handleStopSpeaking: () => void;
}

const VoiceControls = forwardRef<VoiceControlsRef, VoiceControlsProps>(({ 
  onVoiceInput, 
  onVoiceOutput, 
  disabled = false 
}, ref) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speechServiceRef = useRef<WebSpeechService | null>(null);

  // Initialize speech service
  const getSpeechService = useCallback(() => {
    if (!speechServiceRef.current) {
      speechServiceRef.current = new WebSpeechService();
    }
    return speechServiceRef.current;
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleStartSpeaking,
    handleStopSpeaking
  }));

  const handleStartListening = async () => {
    if (disabled) return;
    
    try {
      setError(null);
      setIsListening(true);
      
      const speechService = getSpeechService();
      const transcript = await speechService.startListening();
      
      if (transcript && onVoiceInput) {
        onVoiceInput(transcript);
      }
    } catch (err) {
      console.error('Voice input error:', err);
      setError(err instanceof Error ? err.message : 'Voice input failed');
    } finally {
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    setIsListening(false);
  };

  const handleStartSpeaking = async (text: string) => {
    if (disabled || !text.trim()) return;
    
    try {
      setError(null);
      setIsSpeaking(true);
      
      const speechService = getSpeechService();
      await speechService.speak(text);
      
      if (onVoiceOutput) {
        onVoiceOutput(text);
      }
    } catch (err) {
      console.error('Voice output error:', err);
      setError(err instanceof Error ? err.message : 'Voice output failed');
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleStopSpeaking = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopSpeaking();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={isListening ? handleStopListening : handleStartListening}
          className={`px-4 py-2 rounded transition-colors ${
            isListening 
              ? "bg-red-500 text-white hover:bg-red-600" 
              : "bg-green-500 text-white hover:bg-green-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={disabled}
        >
          {isListening ? "Stop Listening" : "Start Listening"}
        </button>
        
        <button
          onClick={() => handleStopSpeaking()}
          className={`px-4 py-2 rounded transition-colors ${
            isSpeaking 
              ? "bg-red-500 text-white hover:bg-red-600" 
              : "bg-gray-300 text-gray-600 hover:bg-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={disabled || !isSpeaking}
        >
          Stop Speaking
        </button>
      </div>
      
      <div className="text-xs text-gray-500">
        {isListening && "Listening... Speak now"}
        {isSpeaking && "Speaking..."}
        {!isListening && !isSpeaking && "Click to start voice interaction"}
      </div>
    </div>
  );
});

VoiceControls.displayName = 'VoiceControls';

export default VoiceControls;


