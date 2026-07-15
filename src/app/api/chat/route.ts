import { NextRequest, NextResponse } from 'next/server';
import { aiConfig } from '@/lib/ai/config';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64 representation without data:image/... prefix
  };
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: Part[];
}

export async function POST(req: NextRequest) {
  try {
    const { messages, itrData, rawText, isReview } = (await req.json()) as any;

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      try {
        const cfContext = getCloudflareContext();
        const cfEnv = cfContext?.env as any;
        if (cfEnv?.GEMINI_API_KEY) {
          apiKey = cfEnv.GEMINI_API_KEY as string;
        }
      } catch (e) {
        // Silently catch errors if getCloudflareContext is called outside Cloudflare (e.g. tests or local dev without context)
      }
    }

    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not defined.');
      return NextResponse.json({
        role: 'assistant',
        content: 'Gemini AI Assistant is not available because the GEMINI_API_KEY is not configured.',
      });
    }

    const { modelName, systemPrompt, reviewPrompt } = aiConfig;

    // Build system instruction
    let contextPrompt = systemPrompt;
    if (itrData) {
      contextPrompt += `\n\nHere is the current Income Tax Return (ITR) data under review:\n\`\`\`json\n${JSON.stringify(itrData, null, 2)}\n\`\`\``;
    }
    if (rawText) {
      contextPrompt += `\n\nHere is the raw extracted text from the Form-16 PDF:\n${rawText.substring(0, 10000)}`; // Keep within reasonable limits
    }

    if (isReview) {
      contextPrompt += `\n\nSpecial Instruction: The user is requesting a formal validation and review. Focus on identifying missing fields, potential discrepancies (such as standard deduction errors), and tax saving opportunities. Follow this instruction strictly:\n"${reviewPrompt}"`;
    }

    // Format messages for Gemini API
    const formattedContents: ChatMessage[] = (messages || []).map((msg: any) => {
      // Handle roles conversion: 'assistant' to 'model' for Gemini
      const role = msg.role === 'assistant' ? 'model' : 'user';

      const parts: Part[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Handle file attachments if any
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const attach of msg.attachments) {
          parts.push({
            inlineData: {
              mimeType: attach.mimeType,
              data: attach.data, // Base64 without headers
            }
          });
        }
      }

      return { role, parts };
    });

    // If it's a review request and there is no user input, we prepend a helper user message to trigger it.
    if (isReview && formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: reviewPrompt }]
      });
    }

    const requestBody = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: contextPrompt }]
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json(
        { error: `Gemini API reported an error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as any;
    const modelTextResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({
      role: 'assistant',
      content: modelTextResponse,
    });
  } catch (error: any) {
    console.error('Error in AI chat route:', error);
    return NextResponse.json(
      { error: error?.message || 'An internal error occurred' },
      { status: 500 }
    );
  }
}

