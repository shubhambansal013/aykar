export async function extractTextFromPDF(data: ArrayBuffer | Buffer): Promise<string> {
  try {
    let pdfjs: any;
    const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node;

    let disableWorker = false;
    if (isNode) {
      // Node.js environment - use legacy build
      const module = await import('pdfjs-dist/legacy/build/pdf');
      pdfjs = module.default || module;
      disableWorker = true;   // disable worker in Node.js
    } else {
      // browser
      const module = await import('pdfjs-dist');
      pdfjs = module.default || module;
      // Point to the worker source from a reliable CDN
      if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      }
    }

    // Convert input to Uint8Array for pdfjs
    let byteArray: Uint8Array;
    if (Buffer.isBuffer(data)) {
      byteArray = new Uint8Array(data);
    } else if (data instanceof ArrayBuffer) {
      byteArray = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      byteArray = data;
    } else {
      throw new Error('Unsupported data type for PDF extraction');
    }

    const loadingTask = pdfjs.getDocument({
      data: byteArray,
      disableWorker
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
