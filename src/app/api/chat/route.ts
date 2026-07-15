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
    const { messages, itrData, rawText, isReview } = await req.json();

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
      // Return a simulated response when API key is not configured (e.g. in development/tests)
      // to make testing/development seamless.
      console.warn('GEMINI_API_KEY environment variable is not defined. Using mock response mode.');
      return mockAIResponse(isReview, messages, itrData);
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

    const data = await response.json();
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

// Simulated mock response when GEMINI_API_KEY is not configured, aiding tests and preview
function mockAIResponse(isReview: boolean, messages: any[], itrData: any) {
  if (isReview) {
    const grossSalary = itrData?.salary?.grossSalary || 0;
    const stdDeduction = itrData?.salary?.standardDeduction16ia || 0;
    const deductions80C = itrData?.deductions80C || 0;
    const deductions80D = itrData?.deductions80D || 0;

    const recommendations = [];
    if (deductions80C < 150000) {
      recommendations.push({
        section: "80C",
        recommendation: `You have claimed ₹${deductions80C.toLocaleString('en-IN')}. You can claim up to ₹1,50,000 under Section 80C by investing in ELSS, PPF, or NPS.`,
        potentialSavings: (150000 - deductions80C) * 0.2 // Estimated 20% bracket
      });
    }
    if (deductions80D === 0) {
      recommendations.push({
        section: "80D",
        recommendation: "Consider claiming medical insurance premiums under Section 80D (up to ₹25,000 for self/family, and an additional ₹50,000 for senior citizen parents).",
        potentialSavings: 5000
      });
    }

    const reviewResult = {
      status: "SUCCESS_WITH_RECOMMENDATIONS",
      summary: "We have reviewed your Form-16 context. The ITR is overall accurate, with some recommendations for maximizing your tax savings.",
      itrDataOverview: {
        pan: itrData?.employee?.pan || "Not Provided",
        grossSalary,
        totalChapterVIADeductions: itrData?.totalChapterVIADeductions || 0,
        taxPayable: itrData?.taxPayable || 0
      },
      recommendations,
      errors: stdDeduction !== 50000 && grossSalary > 0
        ? ["Standard Deduction under section 16(ia) should be exactly ₹50,000."]
        : []
    };

    return NextResponse.json({
      role: 'assistant',
      content: JSON.stringify(reviewResult, null, 2),
    });
  }

  // General Chat simulation
  const lastMessage = messages?.[messages.length - 1]?.content || '';
  let reply = "Hello! I am your AI tax assistant. How can I help you with your ITR today?";

  if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
    reply = "Hello there! I've loaded your Form-16 / ITR details. Feel free to ask me anything about your tax deductions, salary computation, or schedules.";
  } else if (lastMessage.toLowerCase().includes('pan')) {
    reply = `Your current PAN is configured as: ${itrData?.employee?.pan || 'Not provided in the form yet'}.`;
  } else if (lastMessage.toLowerCase().includes('salary')) {
    reply = `Your gross salary is reported as ₹${itrData?.salary?.grossSalary?.toLocaleString('en-IN') || '0'}. Standard deduction claimed is ₹${itrData?.salary?.standardDeduction16ia?.toLocaleString('en-IN') || '0'}.`;
  } else if (lastMessage.toLowerCase().includes('saving') || lastMessage.toLowerCase().includes('deduction')) {
    reply = "You can save additional taxes under Chapter VI-A sections, including 80C (PPF, ELSS, Insurance), 80D (Health Insurance), 80CCD(1B) (NPS), or 80TTA/80TTB (Savings interest deduction). Let me know if you want to know about a specific section!";
  } else {
    reply = `I've analyzed your question: "${lastMessage}". Based on your ITR data (PAN: ${itrData?.employee?.pan || 'N/A'}, Gross Salary: ₹${itrData?.salary?.grossSalary || 0}), I suggest reviewing your Chapter VI-A deductions. If you attach extra documents, I'll review those too!`;
  }

  return NextResponse.json({
    role: 'assistant',
    content: reply,
  });
}
