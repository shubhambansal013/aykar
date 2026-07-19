import { readFile } from 'fs/promises';
import { extractTextFromPDF } from './src/lib/form16/extractor.js';

(async () => {
  try {
    const buf = await readFile('./sample_form16.pdf');
    const text = await extractTextFromPDF(buf);
    console.log('Extracted text length:', text.length);
    // Write to file for inspection
    const { writeFile } = await import('fs/promises');
    await writeFile('extracted.txt', text);
    console.log('Written to extracted.txt');
    // Also print first 2000 chars
    console.log('First 2000 chars:');
    console.log(text.substring(0, 2000));
  } catch (e) {
    console.error('Error:', e);
  }
})();
