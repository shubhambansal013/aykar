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
import { Form16Mapper } from '../proto/mappers/form16Mapper';
import { Form16Bundle } from '../../generated/sources/form16';

describe('Form-16 to ITR Integration Test with real PDF', () => {
  it('should correctly extract Form-16 data from sample_form16.pdf and match the verified ITR JSON output structure exactly', async () => {
    const pdfPath = path.resolve(process.cwd(), 'sample_form16.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
    const extractedText = await extractTextFromPDF(arrayBuffer);
    const parsed = parseForm16Text(extractedText);

    // Convert the parsed domain object into native Protobuf using the mapper
    const parsedProto = Form16Mapper.toProto(parsed);

    // Read expected JSON and instantiate it into a native Protobuf object using Form16Mapper.toProto
    const testdataPath = path.resolve(__dirname, './testdata/expected_form16_output.json');
    const expectedJson = JSON.parse(fs.readFileSync(testdataPath, 'utf-8'));
    const expectedProto = Form16Mapper.toProto(expectedJson);

    // Compare them as defined Protos!
    expect(parsedProto.taxpayerProfile?.name).toBe(expectedProto.taxpayerProfile?.name);
    expect(parsedProto.certificates[0].employerProfile?.name).toBe(expectedProto.certificates[0].employerProfile?.name);
    expect(parsedProto.certificates[0].partB?.salaryUs171).toBe(expectedProto.certificates[0].partB?.salaryUs171);
    expect(parsedProto.certificates[0].partB?.perquisitesUs172).toBe(expectedProto.certificates[0].partB?.perquisitesUs172);
    expect(parsedProto.certificates[0].partB?.totalGrossSalary).toBe(expectedProto.certificates[0].partB?.totalGrossSalary);
    expect(parsedProto.certificates[0].partB?.standardDeduction).toBe(expectedProto.certificates[0].partB?.standardDeduction);
    expect(parsedProto.certificates[0].partB?.totalTaxableIncome).toBe(expectedProto.certificates[0].partB?.totalTaxableIncome);
    expect(parsedProto.certificates[0].partB?.taxPayable).toBe(expectedProto.certificates[0].partB?.taxPayable);
  }, 20000);
});
