import { Form16Bundle } from '../../generated/sources/form16';
import { createEmptyForm16Bundle, createForm16Proxy } from '../proto/compatibilityProxy';
import { BasicInfoParser } from './BasicInfoParser';
import { SalaryParser } from './SalaryParser';
import { OtherIncomeParser } from './OtherIncomeParser';
import { DeductionsParser } from './DeductionsParser';
import { TaxComputationParser } from './TaxComputationParser';
import { Form16Merger } from './Form16Merger';
import { FormatDetector } from './FormatDetector';
import { DetailedForm16Parser } from './DetailedForm16Parser';

export function mergeForm16Data(docs: any[]): any {
  const actualBundles = docs.map(d => d.__bundle || d);
  const mergedBundle = Form16Merger.merge(actualBundles);
  return createForm16Proxy(mergedBundle);
}

export function parseForm16Text(text: string): any {
  const fingerprint = FormatDetector.detect(text);
  if (fingerprint.template === 'DETAILED_FORM_16') {
    return parseDetailedForm16(text);
  }

  const bundle = createEmptyForm16Bundle();
  const proxy = createForm16Proxy(bundle);

  // Run the modular pipeline of sub-parsers on the proxy
  BasicInfoParser.parse(text, proxy);
  SalaryParser.parse(text, proxy);
  OtherIncomeParser.parse(text, proxy);
  DeductionsParser.parse(text, proxy);
  TaxComputationParser.parse(text, proxy);

  return proxy;
}

// ----------------------------------------------------
// HYBRID POSITIONAL & REGEX HIGH-FIDELITY PARSERS FOR TARGET PDF FORMATS
// ----------------------------------------------------

export function parseDetailedForm16(text: string): any {
  const parsed = DetailedForm16Parser.parse(text);
  const bundle = createEmptyForm16Bundle();
  if (parsed) {
    bundle.certificates = [parsed as any];
  }
  return createForm16Proxy(bundle);
}

export function parseForm16ToDetailedBundle(texts: string[]): any {
  const parsedBundle = DetailedForm16Parser.parseToDetailedBundle(texts);
  return createForm16Proxy(parsedBundle as any);
}
