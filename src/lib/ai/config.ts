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

// Helper function to dynamically locate the default model for a given provider
const getDefaultModelName = (providerName: string): string => {
  const provider = providersConfig.find(p => p.provider === providerName);
  
  // Find the model with isDefault: true
  const defaultModel = provider?.models.find(m => m.isDefault);
  
  // Return the default model value, or fallback to the first model in the list, or a generic string
  return defaultModel?.value || provider?.models[0]?.value || '';
};

const defaultProvider = 'gemini';

export const aiConfig: AIConfig = {
  provider: defaultProvider,
  // Dynamically resolved from the provider's default instead of a hardcoded string
  modelName: getDefaultModelName(defaultProvider),
  systemPrompt: `You are an AI assistant specialized in Indian Income Tax Returns (ITR).
You help users verify, review, and answer questions about their Form-16 and ITR data.
Always provide helpful, precise, and professional recommendations for saving taxes, complying with tax laws, and correcting potential errors.`,
  reviewPrompt: `Verify the ITR for the provided form and add any recommendations for saving tax if possible. The final ITR should be accurate and without any errors. Provide the output in a structured json that can be consumed easily and doesn't break.`
};
