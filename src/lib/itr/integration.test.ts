import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { webcrypto } from 'crypto';

// Polyfill Web Crypto API for Node.js/jsdom environment (required by pdfjs-dist for cryptographic operations/hashing)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as any;
}

// Minimal DOMMatrix polyfill for Node.js/jsdom test runner environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    a: number = 1; b: number = 0; c: number = 0; d: number = 1; e: number = 0; f: number = 0;
    constructor(init?: string | number[]) {
      if (Array.isArray(init)) {
        this.a = init[0] ?? 1;
        this.b = init[1] ?? 0;
        this.c = init[2] ?? 0;
        this.d = init[3] ?? 1;
        this.e = init[4] ?? 0;
        this.f = init[5] ?? 0;
      }
    }
  } as any;
}

// Polyfill Promise.try for environments/Node versions that do not support it natively yet (e.g. Node 22 or older Vitest envs)
if (typeof Promise.try === 'undefined') {
  (Promise as any).try = function(fn: (...args: any[]) => any, ...args: any[]) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (err) {
        reject(err);
      }
    });
  };
}

import { extractTextFromPDF } from '../form16/extractor';
import { parseForm16Text } from '../form16/parser';

describe('Form-16 to ITR Integration Test with real PDF', () => {
  it('should correctly extract Form-16 data from sample_form16.pdf and match the verified ITR JSON output structure exactly', async () => {
    const pdfPath = path.resolve(process.cwd(), 'sample_form16.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
    const extractedText = await extractTextFromPDF(arrayBuffer);
    const parsed = parseForm16Text(extractedText);

    // Read expected JSON from external testdata file for clean human readability
    const testdataPath = path.resolve(__dirname, './testdata/expected_form16_output.json');
    const expectedJson = JSON.parse(fs.readFileSync(testdataPath, 'utf-8'));

    // Sanitize parsed results to remove optional/extra fields not present in expected JSON (e.g. "code" inside "exemptAllowancesUs10")
    const sanitizedParsed = JSON.parse(JSON.stringify(parsed));
    sanitizedParsed.salary.exemptAllowancesUs10 = parsed.salary.exemptAllowancesUs10.map(({ nature, amount }) => ({ nature, amount }));

    expect(sanitizedParsed).toEqual(expectedJson);
  }, 20000);
});
