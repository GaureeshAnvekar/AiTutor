# Voice Integration for AI Tutor

This document describes the voice integration features added to the AI Tutor application.

## Features Implemented

### 1. Voice Input (Speech-to-Text)
- Uses Web Speech API for browser-based speech recognition
- Converts spoken questions to text automatically
- Integrates with existing chat pipeline
- Supports automatic message sending after voice input

### 2. Voice Output (Text-to-Speech)
- Uses Web Speech API for browser-based text-to-speech
- Automatically speaks AI responses when enabled
- Manual control to stop/start speaking
- Configurable auto-speak toggle

### 3. Browser Compatibility
- Checks for Web Speech API support
- Provides user feedback on compatibility
- Graceful fallback for unsupported browsers
- Works best with Chrome, Edge, and Safari

## Technical Implementation

### Voice Service (`lib/voiceService.ts`)
- `WebSpeechService`: Handles speech recognition and synthesis
- `VoiceService`: Gemini API integration (for future use)
- Error handling and browser compatibility checks

### Voice Controls (`components/VoiceControls.tsx`)
- React component with forwardRef for external control
- Handles voice input/output with proper state management
- Error display and user feedback

### Chat Panel Integration (`components/ChatPanel.tsx`)
- Integrated voice controls into existing chat interface
- Auto-speak toggle for AI responses
- Browser compatibility checking
- Seamless integration with existing message flow

## Usage Flow

1. **User speaks a question** → Voice input captures speech
2. **Speech converted to text** → Web Speech API processes audio
3. **Text sent to chat API** → Existing vector search and AI processing
4. **AI response received** → Text displayed in chat
5. **Response spoken aloud** → Text-to-speech plays audio (if enabled)

## Browser Requirements

- **Chrome**: Full support
- **Edge**: Full support  
- **Safari**: Full support
- **Firefox**: Limited support (no speech recognition)

## Environment Variables

Add to your `.env` file:
```
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

## Future Enhancements

1. **Gemini Live API Integration**: Real-time voice processing
2. **Audio Format Conversion**: Support for different audio formats
3. **Voice Activity Detection**: Automatic start/stop of recording
4. **Multiple Language Support**: Support for different languages
5. **Voice Commands**: Special commands for PDF navigation

## Testing

To test the voice features:

1. Open the application in a supported browser
2. Navigate to a PDF document
3. Click "Start Listening" and speak a question
4. Verify the text appears in the chat input
5. Check that the AI response is spoken (if auto-speak is enabled)

## Troubleshooting

### Common Issues

1. **"Speech recognition not supported"**
   - Use Chrome, Edge, or Safari
   - Check browser permissions for microphone

2. **"Microphone access denied"**
   - Allow microphone access in browser settings
   - Check system microphone permissions

3. **"No speech detected"**
   - Speak clearly and wait for processing
   - Check microphone is working
   - Try speaking louder

4. **Voice not working**
   - Check browser compatibility
   - Verify microphone permissions
   - Try refreshing the page

