export interface AIConfig {
  provider: 'gemini' | string;
  modelName: string;
  systemPrompt: string;
  reviewPrompt: string;
}

export interface ModelOption {
  value: string;
  label: string;
  isDefault?: boolean;
}

export interface ProviderConfig {
  provider: string;
  models: ModelOption[];
}

// Configurable list of available models per provider
export const providersConfig: ProviderConfig[] = [
  {
    provider: 'gemini',
    models: [
      { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite', isDefault: true },
      { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
      { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (404)' }
    ]
  }
];

export const aiConfig: AIConfig = {
  provider: 'gemini',
  // Default fallback model
  modelName: 'gemini-1.5-flash',
  systemPrompt: `You are an AI assistant specialized in Indian Income Tax Returns (ITR).
You help users verify, review, and answer questions about their Form-16 and ITR data.
Always provide helpful, precise, and professional recommendations for saving taxes, complying with tax laws, and correcting potential errors.`,
  reviewPrompt: `Verify the ITR for the provided form and add any recommendations for saving tax if possible. The final ITR should be accurate and without any errors. Provide the output in a structured json that can be consumed easily and doesn't break.`
};
