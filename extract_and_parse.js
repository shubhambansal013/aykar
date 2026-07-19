import { readFile } from 'fs/promises';
import { extractTextFromPDF } from './src/lib/form16/extractor.js';
import { parseForm16Text } from './src/lib/form16/parser.js';

async function main() {
  const pdfPath = './sample_form16.pdf';
  const pdfBuffer = await readFile(pdfPath);
  const text = await extractTextFromPDF(pdfBuffer);
  console.log('Extracted text length:', text.length);
  // Save extracted text for inspection
  await require('fs/promises').writeFile('extracted.txt', text);
  console.log('Saved extracted text to extracted.txt');
  const parsed = parseForm16Text(text);
  console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
}

main().catch(console.error);
