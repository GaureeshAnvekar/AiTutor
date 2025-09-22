"use client";
import { useState } from "react";

export default function VoiceControls() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleStartListening = () => {
    setIsListening(true);
    // Placeholder: start voice recognition
    setTimeout(() => setIsListening(false), 3000);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handleStartSpeaking = () => {
    setIsSpeaking(true);
    // Placeholder: start text-to-speech
    setTimeout(() => setIsSpeaking(false), 3000);
  };

  const handleStopSpeaking = () => {
    setIsSpeaking(false);
  };

  return (
    <div className="flex gap-2 p-4 border rounded-lg">
      <button
        onClick={isListening ? handleStopListening : handleStartListening}
        className={`px-4 py-2 rounded ${
          isListening ? "bg-red-500 text-white" : "bg-green-500 text-white"
        }`}
      >
        {isListening ? "Stop Listening" : "Start Listening"}
      </button>
      
      <button
        onClick={isSpeaking ? handleStopSpeaking : handleStartSpeaking}
        className={`px-4 py-2 rounded ${
          isSpeaking ? "bg-red-500 text-white" : "bg-blue-500 text-white"
        }`}
      >
        {isSpeaking ? "Stop Speaking" : "Start Speaking"}
      </button>
    </div>
  );
}


