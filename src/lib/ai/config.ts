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
  reviewPrompt: `Please perform a comprehensive validation and review of the extracted Form-16 data.
Analyze the fields for correctness, check if any values are missing, cross-reference calculation consistency, and suggest tax-saving recommendations (e.g., under Chapter VI-A like Section 80C, 80D, 80TTA, standard deduction u/s 16ia, etc.).

You MUST strictly output a structured JSON block wrapped in a \`\`\`json ... \`\`\` code block. Do NOT return raw markdown text, tables, or raw validated ITR JSON, as those are hard to read and copy-paste.

The JSON structure must match this schema exactly:
{
  "recommendations": [
    {
      "type": "error" | "warning" | "info",
      "field": "employee.pan or deductions80C etc.",
      "message": "Detailed description of the discrepancy, error, or recommendation",
      "suggestion": "Practical action the user should take (e.g., limit 80C to 1,50,000, or invest in NPS to save tax)"
    }
  ],
  "updatedForm16Data": {
    // A complete Form16Data object containing the updated/corrected/optimized values. Provide the entire Form16Data structure matching the input, with any appropriate corrections applied.
  }
}`
};
