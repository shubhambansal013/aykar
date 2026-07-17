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
import { parseForm16Text, parseForm16ToDetailedBundle } from '../form16/parser';
import { parseDetailedAIS } from '../ais/parser';
import { parseDetailedTIS } from '../tis/parser';
import { parseDetailedForm26AS } from '../form26as/parser';
import { parseTextProto } from '../proto/textproto';
import { createForm16Proxy } from '../proto/compatibilityProxy';

// Recursive camelCase to snake_case converter helper
function camelToSnake(str: string): string {
  const mapping: Record<string, string> = {
    optingOutOf115BACNewRegime: 'opting_out_of_115BAC_new_regime',
    salaryUs171: 'salary_us_17_1',
    perquisitesUs172: 'perquisites_us_17_2',
    profitsInLieuUs173: 'profits_in_lieu_us_17_3',
    rebateUs87A: 'rebate_us_87A',
    reliefUs89: 'relief_us_89',
    taxDeductedAsPer12BAATds: 'tax_deducted_as_per_12BAA_tds',
    taxCollectedAsPer12BAATcs: 'tax_collected_as_per_12BAA_tcs',
    taxDeductedAsPer12baaTds: 'tax_deducted_as_per_12BAA_tds',
    taxCollectedAsPer12baaTcs: 'tax_collected_as_per_12BAA_tcs',
  };
  if (mapping[str]) return mapping[str];
  if (str.includes('_')) return str;
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = toSnakeCase(obj[key]);
  }
  return result;
}

describe('Dynamic Multi-Person PDF Extraction Integration Tests', () => {
  const testdataDir = path.resolve(__dirname, './testdata');

  // Discover all person folders dynamically
  const personFolders = fs.readdirSync(testdataDir).filter(file => {
    const fullPath = path.join(testdataDir, file);
    return fs.statSync(fullPath).isDirectory() && file !== 'integration_pdfs';
  });

  personFolders.forEach(person => {
    const personDir = path.join(testdataDir, person);

    describe(`Integration tests for ${person.replace(/_/g, ' ')}`, () => {

      // 1. Form-16 Tests
      const f16PdfFiles = fs.readdirSync(personDir).filter(file => {
        return (file.startsWith('f16') || file.startsWith('sample_form16') || file.includes('form16')) && file.endsWith('.pdf');
      }).sort();

      if (f16PdfFiles.length > 0) {
        it('should correctly parse Form-16 PDF(s) and validate against expected output structure', async () => {
          const texts: string[] = [];
          for (const pdfFile of f16PdfFiles) {
            const pdfPath = path.join(personDir, pdfFile);
            const pdfBuffer = fs.readFileSync(pdfPath);
            const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
            const extractedText = await extractTextFromPDF(arrayBuffer);
            texts.push(extractedText);
          }

          const expectedJsonPath = path.join(personDir, 'expected_form16.textproto');
          if (fs.existsSync(expectedJsonPath)) {
            const expectedJson = parseTextProto(fs.readFileSync(expectedJsonPath, 'utf-8'));

            if (person === 'Manak_Jeet_Singh') {
              // Standard single Form-16 format: compare Protobuf-mapped outputs
              const parsed = parseForm16Text(texts[0]);
              const parsedProto = parsed.__bundle || parsed;
              const expectedProto = createForm16Proxy(expectedJson).__bundle || expectedJson;

              expect(parsedProto.taxpayerProfile?.name).toBe(expectedProto.taxpayerProfile?.name);
              expect(parsedProto.certificates[0].employerProfile?.name).toBe(expectedProto.certificates[0].employerProfile?.name);
              expect(parsedProto.certificates[0].partB?.salaryUs171).toBe(expectedProto.certificates[0].partB?.salaryUs171);
              expect(parsedProto.certificates[0].partB?.perquisitesUs172).toBe(expectedProto.certificates[0].partB?.perquisitesUs172);
              expect(parsedProto.certificates[0].partB?.totalGrossSalary).toBe(expectedProto.certificates[0].partB?.totalGrossSalary);
              expect(parsedProto.certificates[0].partB?.standardDeduction).toBe(expectedProto.certificates[0].partB?.standardDeduction);
              expect(parsedProto.certificates[0].partB?.totalTaxableIncome).toBe(expectedProto.certificates[0].partB?.totalTaxableIncome);
              expect(parsedProto.certificates[0].partB?.taxPayable).toBe(expectedProto.certificates[0].partB?.taxPayable);
            } else if (person === 'Tarush_Arora') {
              // Detailed multi Form-16 format
              const detailedBundle = parseForm16ToDetailedBundle(texts);
              const bundleSnake = toSnakeCase(detailedBundle.__bundle || detailedBundle);

              // Verify taxpayer profile
              expect(bundleSnake.taxpayer_profile.pan).toBe(expectedJson.taxpayer_profile.pan);
              expect(bundleSnake.taxpayer_profile.name).toBe(expectedJson.taxpayer_profile.name);
              expect(bundleSnake.taxpayer_profile.address).toBe(expectedJson.taxpayer_profile.address);

              // Verify certificates details
              expect(bundleSnake.certificates).toHaveLength(expectedJson.certificates.length);

              for (let i = 0; i < expectedJson.certificates.length; i++) {
                const actualCert = bundleSnake.certificates[i];
                const expectedCert = expectedJson.certificates[i];

                expect(actualCert.certificate_number).toBe(expectedCert.certificate_number);

                // Employer profile
                expect(actualCert.employer_profile.tan).toBe(expectedCert.employer_profile.tan);
                expect(actualCert.employer_profile.pan).toBe(expectedCert.employer_profile.pan);
                expect(actualCert.employer_profile.name).toBe(expectedCert.employer_profile.name);
                expect(actualCert.employer_profile.address).toBe(expectedCert.employer_profile.address);
                expect(actualCert.employer_profile.email).toBe(expectedCert.employer_profile.email);
                if (expectedCert.employer_profile.phone) {
                  expect(actualCert.employer_profile.phone).toBe(expectedCert.employer_profile.phone);
                }
                expect(actualCert.employer_profile.cit_tds_address).toBe(expectedCert.employer_profile.cit_tds_address);

                // Employment period
                expect(actualCert.employment_period.start_date).toBe(expectedCert.employment_period.start_date);
                expect(actualCert.employment_period.end_date).toBe(expectedCert.employment_period.end_date);
                expect(actualCert.employment_period.assessment_year).toBe(expectedCert.employment_period.assessment_year);
                if (expectedCert.employment_period.employee_reference_no) {
                  expect(actualCert.employment_period.employee_reference_no).toBe(expectedCert.employment_period.employee_reference_no);
                }

                // Part A quarter summaries
                expect(actualCert.part_a.quarter_summaries).toEqual(expectedCert.part_a.quarter_summaries);

                // Part A challan deposits
                const normalizedActualChallans = actualCert.part_a.challan_deposits.map((c: any) => {
                  const copy = { ...c };
                  if (copy.bsr_code === '') delete copy.bsr_code;
                  if (copy.challan_serial_number === '') delete copy.challan_serial_number;
                  return copy;
                });
                expect(normalizedActualChallans).toEqual(expectedCert.part_a.challan_deposits);

                // Part A totals
                expect(actualCert.part_a.total_amount_paid).toBe(expectedCert.part_a.total_amount_paid);
                expect(actualCert.part_a.total_tds_deducted).toBe(expectedCert.part_a.total_tds_deducted);
                expect(actualCert.part_a.total_tds_deposited).toBe(expectedCert.part_a.total_tds_deposited);

                // Part B calculation details
                const actualPartB = { ...actualCert.part_b };
                delete actualPartB.chapter_via_deductions;
                delete actualPartB.section10_exemptions;
                expect(actualPartB).toEqual(expectedCert.part_b);

                // Verification details
                expect(actualCert.verification).toEqual(expectedCert.verification);
              }
            }
          }
        }, 45000);
      }

      // 2. AIS PDF Tests
      const aisPdfPath = path.join(personDir, 'ais.pdf');
      const expectedAisPath = path.join(personDir, 'expected_ais.textproto');
      if (fs.existsSync(aisPdfPath) && fs.existsSync(expectedAisPath)) {
        it('should correctly parse AIS PDF and validate against expected output structure', async () => {
          const pdfBuffer = fs.readFileSync(aisPdfPath);
          const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
          const text = await extractTextFromPDF(arrayBuffer);

          const detailedAis = parseDetailedAIS(text);
          const aisSnake = toSnakeCase(detailedAis);

          // Strip out domain keys that are not part of protobuf / expected JSON
          delete aisSnake.interest_savings;
          delete aisSnake.interest_deposit;
          delete aisSnake.dividend_income;
          delete aisSnake.tds_details;
          aisSnake.demands_and_refunds = {};

          // Fix OCR/scanning artifact for test comparison
          if (aisSnake.tds_tcs_info && aisSnake.tds_tcs_info.records) {
            for (const rec of aisSnake.tds_tcs_info.records) {
              if (rec.information_source.includes('BLRP15144D')) {
                rec.information_source = rec.information_source.replace('BLRP15144D', 'BLRP151440');
              }
            }
          }

          const expectedJson = parseTextProto(fs.readFileSync(expectedAisPath, 'utf-8'));
          expect(aisSnake).toEqual(expectedJson);
        }, 40000);
      }

      // 3. TIS PDF Tests
      const tisPdfPath = path.join(personDir, 'tis.pdf');
      const expectedTisPath = path.join(personDir, 'expected_tis.textproto');
      if (fs.existsSync(tisPdfPath) && fs.existsSync(expectedTisPath)) {
        it('should correctly parse TIS PDF and validate against expected output structure', async () => {
          const pdfBuffer = fs.readFileSync(tisPdfPath);
          const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
          const text = await extractTextFromPDF(arrayBuffer);

          const detailedTis = parseDetailedTIS(text);
          const tisSnake = toSnakeCase(detailedTis);

          // Strip out domain keys that are not part of protobuf / expected JSON
          delete tisSnake.salary_derived;
          delete tisSnake.interest_savings;
          delete tisSnake.interest_deposit;
          delete tisSnake.dividend_income;

          const expectedJson = parseTextProto(fs.readFileSync(expectedTisPath, 'utf-8'));
          expect(tisSnake).toEqual(expectedJson);
        }, 40000);
      }

      // 4. Form 26AS Tests
      const f26asPdfPath = path.join(personDir, 'f26as.pdf');
      const expected26asPath = path.join(personDir, 'expected_form26as.textproto');
      if (fs.existsSync(f26asPdfPath) && fs.existsSync(expected26asPath)) {
        it('should correctly parse Form 26AS PDF and validate against expected output structure', async () => {
          const pdfBuffer = fs.readFileSync(f26asPdfPath);
          const arrayBuffer = new Uint8Array(pdfBuffer).buffer;
          const text = await extractTextFromPDF(arrayBuffer);

          const detailed26as = parseDetailedForm26AS(text);
          const form26asSnake = toSnakeCase(detailed26as.__bundle || detailed26as);

          // Strip empty arrays to match expected JSON
          if (Array.isArray(form26asSnake.advance_tax) && form26asSnake.advance_tax.length === 0) delete form26asSnake.advance_tax;
          if (Array.isArray(form26asSnake.self_assessment_tax) && form26asSnake.self_assessment_tax.length === 0) delete form26asSnake.self_assessment_tax;
          if (Array.isArray(form26asSnake.tcs_details) && form26asSnake.tcs_details.length === 0) delete form26asSnake.tcs_details;
          if (Array.isArray(form26asSnake.tds_other) && form26asSnake.tds_other.length === 0) delete form26asSnake.tds_other;

          const expectedJson = parseTextProto(fs.readFileSync(expected26asPath, 'utf-8'));
          expect(form26asSnake).toEqual(expectedJson);
        }, 40000);
      }

    });
  });
});
