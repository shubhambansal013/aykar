export async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist');

    // Point to the worker source from a reliable CDN
    if (typeof window !== 'undefined' && 'Worker' in window) {
      // Using unpkg as a fallback since cdnjs might be lagging or have different path structures for newer versions
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({
      data,
      useWorkerFetch: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    if (error instanceof Error && error.message.includes('worker')) {
      throw new Error(`PDF worker initialization failed: ${error.message}. Please check your internet connection.`);
    }
    throw error;
  }
}
