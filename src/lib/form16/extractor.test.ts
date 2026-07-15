import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPDF } from './extractor';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  version: '6.1.200'
}));

describe('extractTextFromPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract text from a PDF', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ str: 'Hello' }, { str: 'World' }]
      })
    };

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage)
    };

    const pdfjs = await import('pdfjs-dist');
    (pdfjs.getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf)
    });

    const result = await extractTextFromPDF(new ArrayBuffer(0));
    expect(result).toBe('Hello World\n');
    expect(pdfjs.getDocument).toHaveBeenCalled();
  });

  it('should reconstruct lines based on spatial layout (transform matrix)', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          { str: 'World', transform: [1, 0, 0, 1, 100, 500] },
          { str: 'Hello', transform: [1, 0, 0, 1, 10, 500] },
          { str: 'Line 2', transform: [1, 0, 0, 1, 10, 400] }
        ]
      })
    };

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(mockPage)
    };

    const pdfjs = await import('pdfjs-dist');
    (pdfjs.getDocument as any).mockReturnValue({
      promise: Promise.resolve(mockPdf)
    });

    const result = await extractTextFromPDF(new ArrayBuffer(0));
    // Y: 500 should be before Y: 400.
    // Within Y: 500, X: 10 ('Hello') should be before X: 100 ('World').
    expect(result).toBe('Hello World\nLine 2\n');
  });

  it('should handle errors during extraction', async () => {
    const pdfjs = await import('pdfjs-dist');
    (pdfjs.getDocument as any).mockReturnValue({
      promise: Promise.reject(new Error('Failed to load'))
    });

    await expect(extractTextFromPDF(new ArrayBuffer(0))).rejects.toThrow('Failed to load');
  });

  it('should handle worker errors specifically', async () => {
    const pdfjs = await import('pdfjs-dist');
    (pdfjs.getDocument as any).mockReturnValue({
      promise: Promise.reject(new Error('Setting up fake worker failed'))
    });

    await expect(extractTextFromPDF(new ArrayBuffer(0))).rejects.toThrow(/PDF worker initialization failed/);
  });
});
