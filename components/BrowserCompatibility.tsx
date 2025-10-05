"use client";
import { useState, useEffect } from "react";

interface BrowserCompatibilityProps {
  onCompatibilityChange?: (isSupported: boolean) => void;
}

export default function BrowserCompatibility({ onCompatibilityChange }: BrowserCompatibilityProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [features, setFeatures] = useState({
    speechRecognition: false,
    speechSynthesis: false,
    mediaDevices: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkCompatibility = () => {
      const speechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const speechSynthesis = !!window.speechSynthesis;
      const mediaDevices = !!navigator.mediaDevices?.getUserMedia;

      const compatibility = {
        speechRecognition,
        speechSynthesis,
        mediaDevices
      };

      setFeatures(compatibility);
      
      const supported = speechRecognition && speechSynthesis;
      setIsSupported(supported);
      
      if (onCompatibilityChange) {
        onCompatibilityChange(supported);
      }
    };

    checkCompatibility();
  }, [onCompatibilityChange]);

  if (isSupported === null) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Checking browser compatibility...
      </div>
    );
  }

  if (isSupported) {
    return (
      <div className="text-sm text-green-600 p-2 bg-green-50 rounded">
        ✓ Voice features are supported in your browser
      </div>
    );
  }

  return (
    <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded">
      <div className="font-medium mb-1">Voice features limited in your browser:</div>
      <ul className="text-xs space-y-1">
        {!features.speechRecognition && (
          <li>• Speech recognition not supported</li>
        )}
        {!features.speechSynthesis && (
          <li>• Text-to-speech not supported</li>
        )}
        {!features.mediaDevices && (
          <li>• Microphone access not available</li>
        )}
      </ul>
      <div className="text-xs mt-2">
        Try using Chrome, Edge, or Safari for full voice support.
      </div>
    </div>
  );
}
