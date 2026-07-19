import * as protobuf from 'protobufjs';
import * as textformat from 'protobufjs/ext/textformat';

// Install Text Format support into protobufjs
textformat.install();

const root = new protobuf.Root();
root.resolvePath = (origin: string, target: string) => {
  if (target.startsWith('proto/')) return target;
  return 'proto/' + target;
};

root.loadSync([
  'proto/common/common.proto',
  'proto/sources/form16.proto',
  'proto/sources/ais.proto',
  'proto/sources/tis.proto',
  'proto/sources/form26as.proto',
  'proto/platform/engine.proto',
  'proto/platform/itr.proto'
]);

export function parseTextProto(text: string, typeName?: string): any {
  let resolvedType = typeName;
  if (!resolvedType) {
    if (text.includes('certificates') || text.includes('taxpayer_profile')) {
      resolvedType = 'tax.sources.form16.Form16Bundle';
    } else if (text.includes('interest_savings') && text.includes('tds_details')) {
      resolvedType = 'tax.sources.ais.AnnualInformationStatement';
    } else if (text.includes('categories') || text.includes('details')) {
      resolvedType = 'tax.sources.tis.TaxpayerInformationSummary';
    } else if (text.includes('tds_salary') || text.includes('tds_other')) {
      resolvedType = 'tax.sources.form26as.Form26AS';
    } else {
      throw new Error('Unable to automatically resolve protobuf type for textproto parsing.');
    }
  }

  const MyType = root.lookupType(resolvedType);
  const msg = MyType.fromText(text);
  return MyType.toObject(msg, {
    keepCase: false,
    defaults: true,
    arrays: true,
    objects: true,
  } as any);
}

function normalizeKeysForProtobufJS(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeysForProtobufJS);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('_') && key !== '_dividendIncome' && key !== '_interestDeposit' && key !== '_interestSavings' && key !== '_tdsDetails') {
      if (key !== '__bundle') continue;
    }

    let normalizedKey = key;
    const mapping: Record<string, string> = {
      salaryUs171: 'salaryUs_17_1',
      perquisitesUs172: 'perquisitesUs_17_2',
      profitsInLieuUs173: 'profitsInLieuUs_17_3',
      grossSalaryUs171: 'grossSalaryUs_17_1',
      gross_salary_us_17_1: 'grossSalaryUs_17_1',
      profitsInLieuOfSalaryUs173: 'profitsInLieuOfSalaryUs_17_3',
      profits_in_lieu_of_salary_us_17_3: 'profitsInLieuOfSalaryUs_17_3',
      valueOfPerquisitesUs172: 'valueOfPerquisitesUs_17_2',
      value_of_perquisites_us_17_2: 'valueOfPerquisitesUs_17_2',
      taxDeductedAsPer12BAATds: 'taxDeductedAsPer_12BAATds',
      taxCollectedAsPer12BAATcs: 'taxCollectedAsPer_12BAATcs',
      optingOutOf115BACNewRegime: 'optingOutOf_115BACNewRegime',
    };
    if (mapping[key]) {
      normalizedKey = mapping[key];
    }
    result[normalizedKey] = normalizeKeysForProtobufJS(obj[key]);
  }
  return result;
}

export function stringifyTextProto(obj: any, typeName: string): string {
  const MyType = root.lookupType(typeName);
  const normObj = normalizeKeysForProtobufJS(obj);
  const msg = MyType.fromObject(normObj);
  return MyType.toText(msg);
}

export function toPlainObject(obj: any, typeName: string): any {
  const MyType = root.lookupType(typeName);
  const normObj = normalizeKeysForProtobufJS(obj);
  const msg = MyType.fromObject(normObj);
  return MyType.toObject(msg, {
    keepCase: false,
    defaults: true,
    arrays: true,
    objects: true,
  } as any);
}
