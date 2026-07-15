import { NextRequest } from 'next/server';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

describe('AI Chat Route API Handler', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.restoreAllMocks();
  });

  test('returns simulated responses when GEMINI_API_KEY is not defined (review mode)', async () => {
    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [],
        itrData: {
          employee: { pan: 'ABCDE1234F' },
          salary: { grossSalary: 1000000, standardDeduction16ia: 50000 },
          deductions80C: 120000,
          totalChapterVIADeductions: 120000,
          taxPayable: 75000,
        },
        isReview: true,
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.role).toBe('assistant');

    // Parse simulated JSON content
    const reviewResult = JSON.parse(json.content);
    expect(reviewResult.status).toBe('SUCCESS_WITH_RECOMMENDATIONS');
    expect(reviewResult.itrDataOverview.pan).toBe('ABCDE1234F');
    expect(reviewResult.recommendations.length).toBeGreaterThan(0);
    // Standard deduction correct, so no errors
    expect(reviewResult.errors).toEqual([]);
  });

  test('returns simulated error if standard deduction is wrong (review mode)', async () => {
    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [],
        itrData: {
          employee: { pan: 'ABCDE1234F' },
          salary: { grossSalary: 1000000, standardDeduction16ia: 40000 },
        },
        isReview: true,
      }),
    });

    const response = await POST(mockReq);
    const json = await response.json();
    const reviewResult = JSON.parse(json.content);
    expect(reviewResult.errors).toContain('Standard Deduction under section 16(ia) should be exactly ₹50,000.');
  });

  test('returns simulated chat responses when GEMINI_API_KEY is not defined', async () => {
    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
        itrData: { employee: { pan: 'ABCDE1234F' }, salary: { grossSalary: 500000 } },
        isReview: false,
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.role).toBe('assistant');
    expect(json.content).toContain('Hello there!');
  });

  test('handles general chat triggers based on message content', async () => {
    const triggers = ['hello', 'pan', 'salary', 'saving', 'other_unhandled_query'];
    for (const trigger of triggers) {
      const mockReq = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: trigger }],
          itrData: { employee: { pan: 'ABCDE1234F' }, salary: { grossSalary: 500000 } },
          isReview: false,
        }),
      });
      const response = await POST(mockReq);
      const json = await response.json();
      expect(json.content).toBeDefined();
    }
  });

  test('correctly maps and sends request to Gemini API when key is present', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MOCK_KEY');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'This is standard output from Gemini' }]
            }
          }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What is my tax savings?', attachments: [{ mimeType: 'image/png', data: 'abcd' }] }
        ],
        itrData: {
          employee: { pan: 'ABCDE1234F' }
        },
        rawText: 'Extracted raw form-16 text',
        isReview: false,
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.role).toBe('assistant');
    expect(json.content).toBe('This is standard output from Gemini');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('gemini-2.5-flash');
    expect(calledUrl).toContain('key=MOCK_KEY');

    const bodyObj = JSON.parse(calledInit.body);
    expect(bodyObj.contents[0].role).toBe('user');
    expect(bodyObj.contents[0].parts[0].text).toBe('What is my tax savings?');
    expect(bodyObj.contents[0].parts[1].inlineData.mimeType).toBe('image/png');
    expect(bodyObj.systemInstruction.parts[0].text).toContain('ABCDE1234F');
    expect(bodyObj.systemInstruction.parts[0].text).toContain('Extracted raw form-16 text');
  });

  test('returns error code if Gemini API fails', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MOCK_KEY');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Invalid parameter structure'
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('Gemini API reported an error');
  });
});
