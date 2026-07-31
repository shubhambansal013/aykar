import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseForm16Text, parseForm16ToDetailedBundle } from '../form16/parser';
import { parseDetailedAIS } from '../ais/parser';
import { parseDetailedTIS } from '../tis/parser';
import { parseDetailedForm26AS } from '../form26as/parser';
import { parseTextProto, toPlainObject } from '../proto/textproto';

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

describe('Dynamic Multi-Person Text Extraction Integration Tests', () => {
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
      const f16TextFiles = fs.readdirSync(personDir).filter(file => {
        return (file.startsWith('f16') || file.startsWith('sample_form16') || file.includes('form16')) && file.endsWith('.txt');
      }).sort();

      if (f16TextFiles.length > 0) {
        it('should correctly parse Form-16 text file(s) and validate against expected output structure', () => {
          const texts = f16TextFiles.map(file => fs.readFileSync(path.join(personDir, file), 'utf-8'));

          const expectedJsonPath = path.join(personDir, 'expected_form16.textproto');
          if (fs.existsSync(expectedJsonPath)) {
            const expectedJson = parseTextProto(fs.readFileSync(expectedJsonPath, 'utf-8'));

            const parsed = texts.length === 1
              ? parseForm16Text(texts[0])
              : parseForm16ToDetailedBundle(texts);
            const parsedProto = parsed.__bundle || parsed;
            const cleanActual = toPlainObject(parsedProto, 'tax.sources.form16.Form16Bundle');
            expect(cleanActual).toEqual(expectedJson);
          }
        });
      }

      // 2. AIS Tests
      const aisPath = path.join(personDir, 'ais.txt');
      const expectedAisPath = path.join(personDir, 'expected_ais.textproto');
      if (fs.existsSync(aisPath) && fs.existsSync(expectedAisPath)) {
        it('should correctly parse AIS text and validate against expected output structure', () => {
          const text = fs.readFileSync(aisPath, 'utf-8');

          const detailedAis = parseDetailedAIS(text);
          const actualProto = detailedAis.__bundle || detailedAis;

          const cleanActual = toPlainObject(actualProto, 'tax.sources.ais.AnnualInformationStatement');

          const expectedJson = parseTextProto(fs.readFileSync(expectedAisPath, 'utf-8'), 'tax.sources.ais.AnnualInformationStatement');

          expect(cleanActual).toEqual(expectedJson);
        });
      }

      // 3. TIS Tests
      const tisPath = path.join(personDir, 'tis.txt');
      const expectedTisPath = path.join(personDir, 'expected_tis.textproto');
      if (fs.existsSync(tisPath) && fs.existsSync(expectedTisPath)) {
        it('should correctly parse TIS text and validate against expected output structure', () => {
          const text = fs.readFileSync(tisPath, 'utf-8');

          const detailedTis = parseDetailedTIS(text);
          const actualProto = detailedTis.__bundle || detailedTis;

          const cleanActual = toPlainObject(actualProto, 'tax.sources.tis.TaxpayerInformationSummary');

          const expectedJson = parseTextProto(fs.readFileSync(expectedTisPath, 'utf-8'), 'tax.sources.tis.TaxpayerInformationSummary');
          expect(cleanActual).toEqual(expectedJson);
        });
      }

      // 4. Form 26AS Tests
      const f26asPath = path.join(personDir, 'f26as.txt');
      const expected26asPath = path.join(personDir, 'expected_form26as.textproto');
      if (fs.existsSync(f26asPath) && fs.existsSync(expected26asPath)) {
        it('should correctly parse Form 26AS text and validate against expected output structure', () => {
          const text = fs.readFileSync(f26asPath, 'utf-8');

          const detailed26as = parseDetailedForm26AS(text);
          const actualProto = detailed26as.__bundle || detailed26as;

          const cleanActual = toPlainObject(actualProto, 'tax.sources.form26as.Form26AS');

          const expectedJson = parseTextProto(fs.readFileSync(expected26asPath, 'utf-8'), 'tax.sources.form26as.Form26AS');
          expect(cleanActual).toEqual(expectedJson);
        });
      }

    });
  });
});
