"use client";

import { GoogleGenAI } from '@google/genai';

export interface VoiceServiceConfig {
  apiKey: string;
  model?: string;
}

export class VoiceService {
  private genAI: GoogleGenAI;
  private model: string;

  constructor(config: VoiceServiceConfig) {
    this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gemini-2.5-flash-native-audio-preview-09-2025';
  }

  /**
   * Convert speech to text using Gemini Live API
   */
  async speechToText(audioBlob: Blob): Promise<string> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      const result = await this.genAI.generateContent({
        contents: [{
          parts: [{
            inlineData: {
              data: base64Audio,
              mimeType: 'audio/wav'
            }
          }]
        }]
      });

      return result.response.text() || '';
    } catch (error) {
      console.error('Speech to text error:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  /**
   * Convert text to speech using Gemini Live API
   */
  async textToSpeech(text: string): Promise<Blob> {
    try {
      const result = await this.genAI.generateContent({
        contents: [{
          parts: [{
            text: text
          }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO']
        }
      });

      // Extract audio data from response
      const audioData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        throw new Error('No audio data received');
      }

      // Convert base64 to blob
      return this.base64ToBlob(audioData, 'audio/wav');
    } catch (error) {
      console.error('Text to speech error:', error);
      throw new Error('Failed to convert text to speech');
    }
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 string to blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

/**
 * Web Speech API wrapper for browser-based speech recognition
 */
export class WebSpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeRecognition();
  }

  private initializeRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }
  }

  /**
   * Start speech recognition
   */
  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      let hasResolved = false;

      this.recognition.onresult = (event) => {
        if (hasResolved) return;
        hasResolved = true;
        
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          resolve(transcript);
        } else {
          reject(new Error('No speech detected'));
        }
      };

      this.recognition.onerror = (event) => {
        if (hasResolved) return;
        hasResolved = true;
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('Speech recognition ended without result'));
        }
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject(new Error('Failed to start speech recognition'));
      }
    });
  }

  /**
   * Stop speech recognition
   */
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Speak text using browser's text-to-speech
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
