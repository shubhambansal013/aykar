import { NormalizedIntermediateForm } from './NormalizedIntermediateForm';

export async function extractIntermediateFormFromPDF(data: ArrayBuffer): Promise<NormalizedIntermediateForm> {
  try {
    const isMock = data.byteLength <= 100;
    const isNode = typeof process !== 'undefined' && process.release && process.release.name === 'node';
    const pdfjs = (isNode && !isMock)
      ? await import('pdfjs-dist/legacy/build/pdf.mjs')
      : await import('pdfjs-dist');

    // Point to the worker source from a reliable CDN
    if (typeof window !== 'undefined' && 'Worker' in window) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({
      data,
    });

    const pdf = await loadingTask.promise;
    const pagesItems: any[][] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      pagesItems.push(textContent.items as any[]);
    }

    return NormalizedIntermediateForm.fromPdfContent(pagesItems);
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    if (error instanceof Error && error.message.includes('worker')) {
      throw new Error(`PDF worker initialization failed: ${error.message}. Please check your internet connection.`);
    }
    throw error;
  }
}

export async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
  const intermediate = await extractIntermediateFormFromPDF(data);
  return intermediate.getFullText() + '\n';
}
