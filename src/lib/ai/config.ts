export interface AIConfig {
  provider: 'gemini' | string;
  modelName: string;
  systemPrompt: string;
  reviewPrompt: string;
}

export const aiConfig: AIConfig = {
  provider: 'gemini',
  // Use gemini-2.5-flash as the free tier model, easily configurable to change
  modelName: 'gemini-2.5-flash',
  systemPrompt: `You are an AI assistant specialized in Indian Income Tax Returns (ITR).
You help users verify, review, and answer questions about their Form-16 and ITR data.
Always provide helpful, precise, and professional recommendations for saving taxes, complying with tax laws, and correcting potential errors.`,
  reviewPrompt: `Verify the ITR for the provided form and add any recommendations for saving tax if possible. The final ITR should be accurate and without any errors. Provide the output in a structured json that can be consumed easily and doesn't break.`
};
