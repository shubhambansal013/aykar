import { NextRequest } from 'next/server';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

describe('AI Chat Route API Handler', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.restoreAllMocks();
  });

  test('returns Gemini not available when GEMINI_API_KEY is not defined', async () => {
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

    const json = (await response.json()) as any;
    expect(json.role).toBe('assistant');
    expect(json.content).toContain('Gemini AI Assistant is not available because the GEMINI_API_KEY is not configured.');
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

    const json = (await response.json()) as any;
    expect(json.role).toBe('assistant');
    expect(json.content).toBe('This is standard output from Gemini');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('gemini');
    expect(calledUrl).toContain('key=MOCK_KEY');

    const bodyObj = JSON.parse(calledInit.body);
    expect(bodyObj.contents[0].role).toBe('user');
    expect(bodyObj.contents[0].parts[0].text).toBe('What is my tax savings?');
    expect(bodyObj.contents[0].parts[1].inlineData.mimeType).toBe('image/png');
    expect(bodyObj.systemInstruction.parts[0].text).toContain('ABCDE1234F');
    expect(bodyObj.systemInstruction.parts[0].text).toContain('Extracted raw form-16 text');
  });

  test('correctly decodes and maps text attachments under parts instead of inlineData', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MOCK_KEY');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Response' }]
            }
          }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const textContent = 'This is content of a plain text file attachment.';
    const base64Data = Buffer.from(textContent).toString('base64');

    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Please analyze this text file.',
            attachments: [
              { name: 'attached_text.txt', mimeType: 'text/plain', data: base64Data }
            ]
          }
        ],
        isReview: false,
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const bodyObj = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodyObj.contents[0].role).toBe('user');
    expect(bodyObj.contents[0].parts[0].text).toBe('Please analyze this text file.');
    expect(bodyObj.contents[0].parts[1].text).toContain('[Attached File: attached_text.txt]');
    expect(bodyObj.contents[0].parts[1].text).toContain(textContent);
    expect(bodyObj.contents[0].parts[1].inlineData).toBeUndefined();
  });

  test('respects custom model name requested in body', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'MOCK_KEY');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'This is output using requested model' }]
            }
          }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockReq = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
        model: 'gemini-2.0-flash',
      }),
    });

    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const json = (await response.json()) as any;
    expect(json.content).toBe('This is output using requested model');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('gemini-2.0-flash');
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

    const json = (await response.json()) as any;
    expect(json.error).toContain('Gemini API reported an error');
  });
});
