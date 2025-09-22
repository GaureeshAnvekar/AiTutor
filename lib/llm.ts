export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMResponse {
  text: string;
  actions?: Array<{
    type: "navigate" | "highlight" | "scroll";
    page?: number;
    bbox?: [number, number, number, number];
    color?: string;
  }>;
}

export async function callLLM(
  messages: ChatMessage[],
  pdfContext?: string
): Promise<LLMResponse> {
  // Placeholder: implement actual LLM integration
  // This would typically call OpenAI, Anthropic, or another LLM provider
  
  const systemMessage = pdfContext 
    ? `You are an AI tutor helping users understand PDF content. Here's the relevant PDF context: ${pdfContext}`
    : "You are an AI tutor helping users with their questions.";
  
  const allMessages = [
    { role: "system" as const, content: systemMessage },
    ...messages
  ];
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: "This is a demo response from the LLM. In a real implementation, this would be the actual AI response.",
        actions: [
          { type: "highlight", page: 1, bbox: [100, 100, 200, 50], color: "#ffff00" }
        ]
      });
    }, 1000);
  });
}


