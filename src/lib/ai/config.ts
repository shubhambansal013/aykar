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
Always provide helpful, precise, and professional recommendations for saving taxes, complying with tax laws, and correcting potential errors.

IMPORTANT: For ANY subsequent chat message, if you suggest or make any corrections or updates to the user's tax details/values, you MUST output a structured JSON block wrapped in a \`\`\`json ... \`\`\` code block at the end of your response, containing "recommendations" and "updatedForm16Data" with the complete updated Form16Data object. This allows the user to apply your suggestions interactively.
Use this format:
\`\`\`json
{
  "recommendations": [
    {
      "type": "error" | "warning" | "info",
      "field": "field path",
      "message": "description of correction",
      "suggestion": "what to do"
    }
  ],
  "updatedForm16Data": { ... }
}
\`\`\`
Provide the complete corrected/updated Form16Data structure matching the input, with any appropriate corrections applied.`,
  reviewPrompt: `Please perform a comprehensive validation, review, and reconciliation of the extracted Form-16 data, taking into account any attached AIS, TIS, and Form 26AS data or raw text context when available.
Analyze the fields for correctness, check if any values are missing, cross-reference calculation consistency, and suggest tax-saving recommendations (e.g., under Chapter VI-A like Section 80C, 80D, 80TTA, standard deduction u/s 16ia, etc.).

Specifically, perform the following cross-reference and reconciliation tasks when supplementary documents are present:
1. Cross-check Form-16 gross salary against TIS derived salary values, reporting any mismatch.
2. Cross-check TDS u/s 192 in Form-16 against TDS salary credits found in Form 26AS to find and log discrepancies.
3. Check for any interest on savings bank deposits, interest on term deposits, or dividend income in the AIS/TIS records. Ensure these supplementary incomes are merged into the otherSources income of Form16Data so they are fully declared and not under-reported.

You MUST strictly output a structured JSON block wrapped in a \`\`\`json ... \`\`\` code block. Do NOT return raw markdown text, tables, or raw validated ITR JSON, as those are hard to read and copy-paste.

The JSON structure must match this schema exactly:
{
  "recommendations": [
    {
      "type": "error" | "warning" | "info",
      "field": "employee.pan or deductions80C or otherIncome.totalOtherSources etc.",
      "message": "Detailed description of the discrepancy, error, or recommendation, including specific AIS/TIS/26AS cross-reference checks.",
      "suggestion": "Practical action the user should take (e.g., limit 80C to 1,50,000, report dividend income of ₹X, or invest in NPS to save tax)"
    }
  ],
  "updatedForm16Data": {
    // A complete Form16Data object containing the updated/corrected/optimized values. Provide the entire Form16Data structure matching the input, with any appropriate corrections applied, such as merging supplementary interest/dividends from AIS/TIS.
  }
}`
};
