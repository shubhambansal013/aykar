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
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      // Check if items have transform matrices for spatial layout reconstruction
      const hasTransform = items.length > 0 && items.every(item => item && Array.isArray(item.transform) && item.transform.length >= 6);

      if (hasTransform) {
        // Group by Y coordinate (transform[5]) with a tolerance of 4.0 units
        const TOLERANCE = 4.0;
        const rows: { y: number; items: any[] }[] = [];

        for (const item of items) {
          const x = item.transform[4];
          const y = item.transform[5];
          const str = item.str;

          // Find if there's an existing row within tolerance
          let matchedRow = rows.find(r => Math.abs(r.y - y) <= TOLERANCE);
          if (matchedRow) {
            matchedRow.items.push({ x, str });
          } else {
            rows.push({ y, items: [{ x, str }] });
          }
        }

        // Sort rows by Y-coordinate descending (top of the page first)
        rows.sort((a, b) => b.y - a.y);

        // Within each row, sort items by X-coordinate ascending
        const reconstructedLines = rows.map(row => {
          row.items.sort((a, b) => a.x - b.x);
          return row.items.map(item => item.str).join(' ');
        });

        fullText += reconstructedLines.join('\n') + '\n';
      } else {
        // Fallback to sequential extraction if transform is not available
        const pageText = items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
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
