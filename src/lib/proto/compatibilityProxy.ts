import { Form16Bundle } from '../../generated/sources/form16';
import { AnnualInformationStatement } from '../../generated/sources/ais';
import { TaxpayerInformationSummary } from '../../generated/sources/tis';
import { Form26AS } from '../../generated/sources/form26as';
import { EngineReconciliationResult } from '../../generated/platform/engine';

export interface ExemptAllowance {
  code?: string;
  nature?: string;
  amount: number;
}

export interface Form16Data {
  employer: {
    name: string;
    tan: string;
    pan: string;
    address: string;
  };
  employee: {
    name: {
      firstName: string;
      middleName: string;
      lastName: string;
    };
    pan: string;
    address: string;
  };
  assessmentYear: string;
  period: {
    from: string;
    to: string;
  };
  salary: {
    grossSalary: number;
    salaryAsPer17_1: number;
    perquisites17_2: number;
    profitsInLieu17_3: number;
    exemptAllowancesUs10: ExemptAllowance[];
    totalExemptAllowances: number;
    netSalary: number;
    standardDeduction16ia: number;
    entertainmentAllowance16ii: number;
    professionalTax16iii: number;
    totalDeductionsUs16: number;
    incomeChargeableUnderHeadSalaries: number;
  };
  otherIncome: {
    houseProperty: number;
    otherSources: Array<{ nature: string; amount: number }>;
    totalOtherSources: number;
  };
  grossTotalIncome: number;
  deductions80C: number;
  deductions80CCC: number;
  deductions80CCD1: number;
  deductions80CCD1B: number;
  deductions80CCD2: number;
  deductions80D: number;
  deductions80E: number;
  deductions80G: number;
  deductions80TTA: number;
  totalChapterVIADeductions: number;
  totalIncome: number;
  taxPayable: number;
}

export interface AISData {
  interestSavings: number;
  interestDeposit: number;
  dividendIncome: number;
  tdsDetails: Array<{
    tan: string;
    deductorName: string;
    section: string;
    amount: number;
  }>;
  metadata?: {
    financialYear: string;
    assessmentYear: string;
  };
  profile?: {
    pan: string;
    name: string;
    address: string;
  };
}

export interface TISData {
  salaryDerived: number;
  interestSavings: number;
  interestDeposit: number;
  dividendIncome: number;
  metadata?: {
    financialYear: string;
    assessmentYear: string;
  };
  profile?: {
    pan: string;
    name: string;
    address: string;
  };
}

export interface Form26ASData {
  tdsSalary: Array<{
    tan: string;
    deductorName: string;
    amount: number;
  }>;
  tdsOther: Array<{
    tan: string;
    deductorName: string;
    section: string;
    amount: number;
  }>;
  tcsDetails: Array<{
    collectorName: string;
    amount: number;
  }>;
  advanceTax: Array<{
    bsrCode: string;
    date: string;
    challanNo: string;
    amount: number;
  }>;
  selfAssessmentTax: Array<{
    bsrCode: string;
    date: string;
    challanNo: string;
    amount: number;
  }>;
  metadata?: {
    financialYear: string;
    assessmentYear: string;
  };
  profile?: {
    pan: string;
    name: string;
    address: string;
  };
}

export interface ReconciledTaxData extends Form16Data {
  aisData?: AISData;
  tisData?: TISData;
  form26asData?: Form26ASData;
  taxCredits?: {
    tdsSalary: number;
    tdsOther: number;
    tcs: number;
    advanceTax: number;
    selfAssessmentTax: number;
  };
  discrepancies?: string[];
  detectedIncomeSources?: Array<{
    source: string;
    category: 'interestSavings' | 'interestDeposit' | 'dividendIncome' | 'salary' | 'other';
    amount: number;
    confirmed: boolean;
  }>;
}

export function createEmptyForm16Bundle(): Form16Bundle {
  return {
    metadata: {
      financialYear: '',
      downloadId: undefined,
      generationDate: new Date(),
      ipAddress: undefined,
    },
    taxpayerProfile: {
      pan: '',
      aadhaarMasked: undefined,
      name: '',
      dateOfBirth: '',
      mobileNumber: undefined,
      emailAddress: undefined,
      address: '',
    },
    certificates: [
      {
        certificateNumber: 'GEN-001',
        employerProfile: {
          tan: '',
          pan: '',
          name: '',
          address: '',
          citTdsAddress: '',
          email: undefined,
          phone: undefined,
        },
        employmentPeriod: {
          startDate: '',
          endDate: '',
          assessmentYear: '',
          employeeReferenceNo: undefined,
        },
        partA: {
          quarterSummaries: [],
          challanDeposits: [],
          totalAmountPaid: 0,
          totalTdsDeducted: 0,
          totalTdsDeposited: 0,
        },
        partB: {
          optingOutOf115BACNewRegime: false,
          salaryUs171: 0,
          perquisitesUs172: 0,
          profitsInLieuUs173: 0,
          salaryFromOtherEmployersReported: 0,
          totalGrossSalary: 0,
          section10Exemptions: [],
          totalSection10Exemptions: 0,
          standardDeduction: 0,
          entertainmentAllowance: 0,
          professionalTax: 0,
          totalSection16Deductions: 0,
          incomeChargeableUnderSalaries: 0,
          incomeFromHousePropertyReported: 0,
          incomeFromOtherSourcesReported: 0,
          grossTotalIncome: 0,
          chapterViaDeductions: {
            sec80C: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCC: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCD1: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCD1B: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCD2: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80D: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80E: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCHEmployee: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80CCHCentralGovt: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80G: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            sec80TTA: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
            otherDeductions: [],
          },
          totalChapterViaDeductions: 0,
          totalTaxableIncome: 0,
          taxOnTotalIncome: 0,
          rebateUs87A: 0,
          surcharge: 0,
          healthEducationCess: 0,
          taxPayable: 0,
          reliefUs89: 0,
          taxDeductedAsPer12BAATds: 0,
          taxCollectedAsPer12BAATcs: 0,
          netTaxPayable: 0,
        },
        perquisitesDetails: undefined,
        verification: {
          signatoryName: '',
          parentName: '',
          designation: '',
          place: '',
          date: '',
          digitalSignatureVerified: false,
        },
      }
    ],
  };
}

export function createEmptyAis(): AnnualInformationStatement {
  return {
    metadata: { financialYear: '', downloadId: undefined, generationDate: new Date(), ipAddress: undefined },
    profile: { pan: '', aadhaarMasked: undefined, name: '', dateOfBirth: '', mobileNumber: undefined, emailAddress: undefined, address: '' },
    tdsTcsInfo: { records: [] },
    sftInfo: { savingsInterest: [], depositInterest: [], securitySales: [], securityPurchases: [] },
    taxPayments: [],
    demandsAndRefunds: undefined,
    otherInfo: { salaries: [] },
  };
}

export function createEmptyTis(): TaxpayerInformationSummary {
  return {
    metadata: { financialYear: '', downloadId: undefined, generationDate: new Date(), ipAddress: undefined },
    profile: { pan: '', aadhaarMasked: undefined, name: '', dateOfBirth: '', mobileNumber: undefined, emailAddress: undefined, address: '' },
    categories: [],
    details: [],
  };
}

export function createEmptyForm26as(): Form26AS {
  return {
    metadata: { financialYear: '', downloadId: undefined, generationDate: new Date(), ipAddress: undefined },
    profile: { pan: '', aadhaarMasked: undefined, name: '', dateOfBirth: '', mobileNumber: undefined, emailAddress: undefined, address: '' },
    tdsSalary: [],
    tdsOther: [],
    tcsDetails: [],
    advanceTax: [],
    selfAssessmentTax: [],
  };
}

export function createEmptyEngineResult(): EngineReconciliationResult {
  return {
    form16Data: createEmptyForm16Bundle(),
    aisData: undefined,
    tisData: undefined,
    form26asData: undefined,
    taxCredits: { tdsSalary: 0, tdsOther: 0, tcs: 0, advanceTax: 0, selfAssessmentTax: 0 },
    discrepancies: [],
    detectedIncomeSources: [],
    calculatedTaxOldRegime: 0,
    calculatedTaxNewRegime: 0,
  };
}

function createArrayProxy(arr: any[], onMutate: (newArr: any[]) => void) {
  return new Proxy(arr, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return function(...args: any[]) {
          const res = val.apply(target, args);
          if (['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort'].includes(String(prop))) {
            onMutate(target);
          }
          return res;
        };
      }
      return val;
    },
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver);
      onMutate(target);
      return res;
    }
  });
}

function mapFlatToBundle(data: any): Form16Bundle {
  const firstName = data.employee?.name?.firstName || '';
  const middleName = data.employee?.name?.middleName || '';
  const lastName = data.employee?.name?.lastName || '';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  const certificate = {
    certificateNumber: 'GEN-001',
    employerProfile: {
      tan: data.employer?.tan || '',
      pan: data.employer?.pan || '',
      name: data.employer?.name || '',
      address: data.employer?.address || '',
      citTdsAddress: '',
      email: undefined,
      phone: undefined,
    },
    employmentPeriod: {
      startDate: data.period?.from || '',
      endDate: data.period?.to || '',
      assessmentYear: data.assessmentYear || '',
      employeeReferenceNo: undefined,
    },
    partA: {
      quarterSummaries: [],
      challanDeposits: [],
      totalAmountPaid: data.salary?.grossSalary || 0,
      totalTdsDeducted: data.taxPayable || 0,
      totalTdsDeposited: data.taxPayable || 0,
    },
    partB: {
      optingOutOf115BACNewRegime: false,
      salaryUs171: data.salary?.salaryAsPer17_1 || 0,
      perquisitesUs172: data.salary?.perquisites17_2 || 0,
      profitsInLieuUs173: data.salary?.profitsInLieu17_3 || 0,
      salaryFromOtherEmployersReported: 0,
      totalGrossSalary: data.salary?.grossSalary || 0,
      section10Exemptions: (data.salary?.exemptAllowancesUs10 || []).map((x: any) => ({
        sectionCode: x.code || '',
        description: x.nature || '',
        amount: x.amount,
      })),
      totalSection10Exemptions: data.salary?.totalExemptAllowances || 0,
      standardDeduction: data.salary?.standardDeduction16ia || 0,
      entertainmentAllowance: data.salary?.entertainmentAllowance16ii || 0,
      professionalTax: data.salary?.professionalTax16iii || 0,
      totalSection16Deductions: data.salary?.totalDeductionsUs16 || 0,
      incomeChargeableUnderSalaries: data.salary?.incomeChargeableUnderHeadSalaries || 0,
      incomeFromHousePropertyReported: data.otherIncome?.houseProperty || 0,
      incomeFromOtherSourcesReported: data.otherIncome?.totalOtherSources || 0,
      grossTotalIncome: data.grossTotalIncome || 0,
      chapterViaDeductions: {
        sec80C: { grossAmount: data.deductions80C || 0, qualifyingAmount: data.deductions80C || 0, deductibleAmount: data.deductions80C || 0 },
        sec80CCC: { grossAmount: data.deductions80CCC || 0, qualifyingAmount: data.deductions80CCC || 0, deductibleAmount: data.deductions80CCC || 0 },
        sec80CCD1: { grossAmount: data.deductions80CCD1 || 0, qualifyingAmount: data.deductions80CCD1 || 0, deductibleAmount: data.deductions80CCD1 || 0 },
        sec80CCD1B: { grossAmount: data.deductions80CCD1B || 0, qualifyingAmount: data.deductions80CCD1B || 0, deductibleAmount: data.deductions80CCD1B || 0 },
        sec80CCD2: { grossAmount: data.deductions80CCD2 || 0, qualifyingAmount: data.deductions80CCD2 || 0, deductibleAmount: data.deductions80CCD2 || 0 },
        sec80D: { grossAmount: data.deductions80D || 0, qualifyingAmount: data.deductions80D || 0, deductibleAmount: data.deductions80D || 0 },
        sec80E: { grossAmount: data.deductions80E || 0, qualifyingAmount: data.deductions80E || 0, deductibleAmount: data.deductions80E || 0 },
        sec80CCHEmployee: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
        sec80CCHCentralGovt: { grossAmount: 0, qualifyingAmount: 0, deductibleAmount: 0 },
        sec80G: { grossAmount: data.deductions80G || 0, qualifyingAmount: data.deductions80G || 0, deductibleAmount: data.deductions80G || 0 },
        sec80TTA: { grossAmount: data.deductions80TTA || 0, qualifyingAmount: data.deductions80TTA || 0, deductibleAmount: data.deductions80TTA || 0 },
        otherDeductions: [],
      },
      totalChapterViaDeductions: data.totalChapterVIADeductions || 0,
      totalTaxableIncome: data.totalIncome || 0,
      taxOnTotalIncome: data.taxPayable || 0,
      rebateUs87A: 0,
      surcharge: 0,
      healthEducationCess: 0,
      taxPayable: data.taxPayable || 0,
      reliefUs89: 0,
      taxDeductedAsPer12BAATds: 0,
      taxCollectedAsPer12BAATcs: 0,
      netTaxPayable: data.taxPayable || 0,
    },
    perquisitesDetails: undefined,
    verification: {
      signatoryName: '',
      parentName: '',
      designation: '',
      place: '',
      date: '',
      digitalSignatureVerified: false,
    },
  };

  return {
    metadata: {
      financialYear: data.assessmentYear ? `${parseInt(data.assessmentYear.split('-')[0], 10) - 1}-${data.assessmentYear.split('-')[0].substring(2)}` : '',
      downloadId: undefined,
      generationDate: new Date(),
      ipAddress: undefined,
    },
    taxpayerProfile: {
      pan: data.employee?.pan || '',
      aadhaarMasked: undefined,
      name: fullName,
      dateOfBirth: '',
      mobileNumber: undefined,
      emailAddress: undefined,
      address: data.employee?.address || '',
    },
    certificates: [certificate],
  };
}

function mapFlatToEngineResult(flat: any): EngineReconciliationResult {
  const form16Data = mapFlatToBundle(flat);
  return {
    form16Data,
    aisData: flat.aisData ? (flat.aisData.__bundle || flat.aisData) : undefined,
    tisData: flat.tisData ? (flat.tisData.__bundle || flat.tisData) : undefined,
    form26asData: flat.form26asData ? (flat.form26asData.__bundle || flat.form26asData) : undefined,
    taxCredits: {
      tdsSalary: flat.taxCredits?.tdsSalary || 0,
      tdsOther: flat.taxCredits?.tdsOther || 0,
      tcs: flat.taxCredits?.tcs || 0,
      advanceTax: flat.taxCredits?.advanceTax || 0,
      selfAssessmentTax: flat.taxCredits?.selfAssessmentTax || 0,
    },
    discrepancies: flat.discrepancies || [],
    detectedIncomeSources: (flat.detectedIncomeSources || []).map((x: any) => ({
      source: x.source || '',
      category: x.category || '',
      amount: x.amount || 0,
      confirmed: !!x.confirmed,
    })),
    calculatedTaxOldRegime: 0,
    calculatedTaxNewRegime: 0,
  };
}

export function createForm16Proxy(bundle: any): Form16Data {
  if (!bundle) return bundle;
  if (bundle.__isForm16Proxy) return bundle;
  if ('employer' in bundle || 'salary' in bundle) {
    return new Proxy(bundle, {
      get(target, prop) {
        if (prop === '__bundle') {
          return mapFlatToBundle(target);
        }
        if (prop === '__isForm16Proxy') return true;
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
  }

  if (!bundle.certificates) {
    bundle.certificates = [];
  }
  if (bundle.certificates.length === 0) {
    bundle.certificates.push(createEmptyForm16Bundle().certificates[0]);
  }
  const cert = bundle.certificates[0];

  if (!(bundle as any)._customNetSalary) {
    (bundle as any)._customNetSalary = cert.partB?.totalGrossSalary && cert.partB?.totalSection10Exemptions ? cert.partB.totalGrossSalary - cert.partB.totalSection10Exemptions : 0;
  }
  if (!(bundle as any)._customOtherSources) (bundle as any)._customOtherSources = [];

  const nameStr = bundle.taxpayerProfile?.name || '';
  const names = nameStr.split(' ');
  if (!(bundle as any)._customFirstName) (bundle as any)._customFirstName = names[0] || '';
  if (!(bundle as any)._customMiddleName) (bundle as any)._customMiddleName = names.length > 2 ? names.slice(1, -1).join(' ') : '';
  if (!(bundle as any)._customLastName) (bundle as any)._customLastName = names.length > 1 ? names[names.length - 1] : '';

  const syncNamesToProto = () => {
    if (bundle.taxpayerProfile) {
      bundle.taxpayerProfile.name = [
        (bundle as any)._customFirstName,
        (bundle as any)._customMiddleName,
        (bundle as any)._customLastName
      ].filter(Boolean).join(' ');
    }
  };

  const employerProxy = new Proxy({}, {
    ownKeys() {
      return ['name', 'tan', 'pan', 'address'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'name') return cert.employerProfile?.name || '';
      if (prop === 'tan') return cert.employerProfile?.tan || '';
      if (prop === 'pan') return cert.employerProfile?.pan || '';
      if (prop === 'address') return cert.employerProfile?.address || '';
      return undefined;
    },
    set(target, prop, value) {
      if (!cert.employerProfile) cert.employerProfile = createEmptyForm16Bundle().certificates[0].employerProfile;
      if (prop === 'name') cert.employerProfile.name = String(value);
      if (prop === 'tan') cert.employerProfile.tan = String(value);
      if (prop === 'pan') cert.employerProfile.pan = String(value);
      if (prop === 'address') cert.employerProfile.address = String(value);
      return true;
    }
  });

  const employeeNameProxy = new Proxy({}, {
    ownKeys() {
      return ['firstName', 'middleName', 'lastName'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'firstName') return (bundle as any)._customFirstName;
      if (prop === 'middleName') return (bundle as any)._customMiddleName;
      if (prop === 'lastName') return (bundle as any)._customLastName;
      return undefined;
    },
    set(target, prop, value) {
      if (prop === 'firstName') (bundle as any)._customFirstName = String(value || '');
      if (prop === 'middleName') (bundle as any)._customMiddleName = String(value || '');
      if (prop === 'lastName') (bundle as any)._customLastName = String(value || '');
      syncNamesToProto();
      return true;
    }
  });

  const employeeProxy = new Proxy({}, {
    ownKeys() {
      return ['name', 'pan', 'address'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'name') return employeeNameProxy;
      if (prop === 'pan') return bundle.taxpayerProfile?.pan || '';
      if (prop === 'address') return bundle.taxpayerProfile?.address || '';
      return undefined;
    },
    set(target, prop, value) {
      if (!bundle.taxpayerProfile) bundle.taxpayerProfile = createEmptyForm16Bundle().taxpayerProfile;
      if (prop === 'pan') bundle.taxpayerProfile.pan = String(value);
      if (prop === 'address') bundle.taxpayerProfile.address = String(value);
      return true;
    }
  });

  const periodProxy = new Proxy({}, {
    ownKeys() {
      return ['from', 'to'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'from') return cert.employmentPeriod?.startDate || '';
      if (prop === 'to') return cert.employmentPeriod?.endDate || '';
      return undefined;
    },
    set(target, prop, value) {
      if (!cert.employmentPeriod) cert.employmentPeriod = createEmptyForm16Bundle().certificates[0].employmentPeriod;
      if (prop === 'from') cert.employmentPeriod.startDate = String(value);
      if (prop === 'to') cert.employmentPeriod.endDate = String(value);
      return true;
    }
  });

  const salaryProxy = new Proxy({}, {
    ownKeys() {
      return [
        'grossSalary', 'salaryAsPer17_1', 'perquisites17_2', 'profitsInLieu17_3',
        'exemptAllowancesUs10', 'totalExemptAllowances', 'netSalary',
        'standardDeduction16ia', 'entertainmentAllowance16ii', 'professionalTax16iii',
        'totalDeductionsUs16', 'incomeChargeableUnderHeadSalaries'
      ];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'grossSalary') return cert.partB?.totalGrossSalary || 0;
      if (prop === 'salaryAsPer17_1') return cert.partB?.salaryUs171 || 0;
      if (prop === 'perquisites17_2') return cert.partB?.perquisitesUs172 || 0;
      if (prop === 'profitsInLieu17_3') return cert.partB?.profitsInLieuUs173 || 0;
      if (prop === 'exemptAllowancesUs10') {
        if (!(bundle as any)._exemptAllowancesUs10) {
          const exempts = cert.partB?.section10Exemptions || [];
          (bundle as any)._exemptAllowancesUs10 = exempts.map(x => ({
            code: x.sectionCode,
            nature: x.description,
            amount: x.amount
          }));
        }
        return createArrayProxy((bundle as any)._exemptAllowancesUs10, (newArr) => {
          if (!cert.partB) cert.partB = createEmptyForm16Bundle().certificates[0].partB;
          cert.partB.section10Exemptions = newArr.map(x => ({
            sectionCode: x.code || '',
            description: x.nature || '',
            amount: x.amount || 0
          }));
        });
      }
      if (prop === 'totalExemptAllowances') return cert.partB?.totalSection10Exemptions || 0;
      if (prop === 'netSalary') return (bundle as any)._customNetSalary || 0;
      if (prop === 'standardDeduction16ia') return cert.partB?.standardDeduction || 0;
      if (prop === 'entertainmentAllowance16ii') return cert.partB?.entertainmentAllowance || 0;
      if (prop === 'professionalTax16iii') return cert.partB?.professionalTax || 0;
      if (prop === 'totalDeductionsUs16') return cert.partB?.totalSection16Deductions || 0;
      if (prop === 'incomeChargeableUnderHeadSalaries') return cert.partB?.incomeChargeableUnderSalaries || 0;
      return undefined;
    },
    set(target, prop, value) {
      if (!cert.partB) cert.partB = createEmptyForm16Bundle().certificates[0].partB;
      if (prop === 'grossSalary') cert.partB.totalGrossSalary = Number(value);
      if (prop === 'salaryAsPer17_1') cert.partB.salaryUs171 = Number(value);
      if (prop === 'perquisites17_2') cert.partB.perquisitesUs172 = Number(value);
      if (prop === 'profitsInLieu17_3') cert.partB.profitsInLieuUs173 = Number(value);
      if (prop === 'exemptAllowancesUs10') {
        (bundle as any)._exemptAllowancesUs10 = (value as any[] || []).map(x => ({
          code: x.code || '',
          nature: x.nature || '',
          amount: x.amount || 0
        }));
        cert.partB.section10Exemptions = ((bundle as any)._exemptAllowancesUs10 as any[]).map(x => ({
          sectionCode: x.code || '',
          description: x.nature || '',
          amount: x.amount || 0
        }));
      }
      if (prop === 'totalExemptAllowances') cert.partB.totalSection10Exemptions = Number(value);
      if (prop === 'netSalary') (bundle as any)._customNetSalary = Number(value);
      if (prop === 'standardDeduction16ia') cert.partB.standardDeduction = Number(value);
      if (prop === 'entertainmentAllowance16ii') cert.partB.entertainmentAllowance = Number(value);
      if (prop === 'professionalTax16iii') cert.partB.professionalTax = Number(value);
      if (prop === 'totalDeductionsUs16') cert.partB.totalSection16Deductions = Number(value);
      if (prop === 'incomeChargeableUnderHeadSalaries') cert.partB.incomeChargeableUnderSalaries = Number(value);
      return true;
    }
  });

  const otherIncomeProxy = new Proxy({}, {
    ownKeys() {
      return ['houseProperty', 'otherSources', 'totalOtherSources'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'houseProperty') return cert.partB?.incomeFromHousePropertyReported || 0;
      if (prop === 'otherSources') {
        if (!(bundle as any)._customOtherSources) {
          (bundle as any)._customOtherSources = [];
        }
        return createArrayProxy((bundle as any)._customOtherSources, (newArr) => {
          // Sync changes if any
        });
      }
      if (prop === 'totalOtherSources') return cert.partB?.incomeFromOtherSourcesReported || 0;
      return undefined;
    },
    set(target, prop, value) {
      if (!cert.partB) cert.partB = createEmptyForm16Bundle().certificates[0].partB;
      if (prop === 'houseProperty') cert.partB.incomeFromHousePropertyReported = Number(value);
      if (prop === 'otherSources') (bundle as any)._customOtherSources = value;
      if (prop === 'totalOtherSources') cert.partB.incomeFromOtherSourcesReported = Number(value);
      return true;
    }
  });

  return new Proxy(bundle, {
    ownKeys() {
      return [
        'employer', 'employee', 'assessmentYear', 'period', 'salary', 'otherIncome',
        'grossTotalIncome', 'deductions80C', 'deductions80CCC', 'deductions80CCD1',
        'deductions80CCD1B', 'deductions80CCD2', 'deductions80D', 'deductions80E',
        'deductions80G', 'deductions80TTA', 'totalChapterVIADeductions', 'totalIncome', 'taxPayable'
      ];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'employer') return employerProxy;
      if (prop === 'employee') return employeeProxy;
      if (prop === 'assessmentYear') return cert.employmentPeriod?.assessmentYear || '';
      if (prop === 'period') return periodProxy;
      if (prop === 'salary') return salaryProxy;
      if (prop === 'otherIncome') return otherIncomeProxy;
      if (prop === 'grossTotalIncome') return cert.partB?.grossTotalIncome || 0;
      if (prop === 'deductions80C') return cert.partB?.chapterViaDeductions?.sec80C?.deductibleAmount || 0;
      if (prop === 'deductions80CCC') return cert.partB?.chapterViaDeductions?.sec80CCC?.deductibleAmount || 0;
      if (prop === 'deductions80CCD1') return cert.partB?.chapterViaDeductions?.sec80CCD1?.deductibleAmount || 0;
      if (prop === 'deductions80CCD1B') return cert.partB?.chapterViaDeductions?.sec80CCD1B?.deductibleAmount || 0;
      if (prop === 'deductions80CCD2') return cert.partB?.chapterViaDeductions?.sec80CCD2?.deductibleAmount || 0;
      if (prop === 'deductions80D') return cert.partB?.chapterViaDeductions?.sec80D?.deductibleAmount || 0;
      if (prop === 'deductions80E') return cert.partB?.chapterViaDeductions?.sec80E?.deductibleAmount || 0;
      if (prop === 'deductions80G') return cert.partB?.chapterViaDeductions?.sec80G?.deductibleAmount || 0;
      if (prop === 'deductions80TTA') return cert.partB?.chapterViaDeductions?.sec80TTA?.deductibleAmount || 0;
      if (prop === 'totalChapterVIADeductions') return cert.partB?.totalChapterViaDeductions || 0;
      if (prop === 'totalIncome') return cert.partB?.totalTaxableIncome || 0;
      if (prop === 'taxPayable') return cert.partB?.taxPayable || 0;

      if (prop === '__isForm16Proxy') return true;
      if (prop === '__bundle') return bundle;

      return (bundle as any)[prop];
    },
    set(target, prop, value) {
      if (!cert.partB) cert.partB = createEmptyForm16Bundle().certificates[0].partB;
      if (!cert.employmentPeriod) cert.employmentPeriod = createEmptyForm16Bundle().certificates[0].employmentPeriod;

      if (prop === 'assessmentYear') cert.employmentPeriod.assessmentYear = String(value);
      else if (prop === 'grossTotalIncome') cert.partB.grossTotalIncome = Number(value);
      else if (prop === 'deductions80C') {
        const d = cert.partB.chapterViaDeductions!.sec80C;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80CCC') {
        const d = cert.partB.chapterViaDeductions!.sec80CCC;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80CCD1') {
        const d = cert.partB.chapterViaDeductions!.sec80CCD1;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80CCD1B') {
        const d = cert.partB.chapterViaDeductions!.sec80CCD1B;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80CCD2') {
        const d = cert.partB.chapterViaDeductions!.sec80CCD2;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80D') {
        const d = cert.partB.chapterViaDeductions!.sec80D;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80E') {
        const d = cert.partB.chapterViaDeductions!.sec80E;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80G') {
        const d = cert.partB.chapterViaDeductions!.sec80G;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'deductions80TTA') {
        const d = cert.partB.chapterViaDeductions!.sec80TTA;
        d.grossAmount = d.qualifyingAmount = d.deductibleAmount = Number(value);
      }
      else if (prop === 'totalChapterVIADeductions') cert.partB.totalChapterViaDeductions = Number(value);
      else if (prop === 'totalIncome') cert.partB.totalTaxableIncome = Number(value);
      else if (prop === 'taxPayable') cert.partB.taxPayable = Number(value);
      else {
        (bundle as any)[prop] = value;
      }
      return true;
    }
  });
}

export function createAisProxy(ais: any): AISData {
  if (!ais) return ais;
  if (ais.__isAisProxy) return ais;
  if ('interestSavings' in ais) return ais;

  if (!(ais as any)._interestSavings) (ais as any)._interestSavings = 0;
  if (!(ais as any)._interestDeposit) (ais as any)._interestDeposit = 0;
  if (!(ais as any)._dividendIncome) (ais as any)._dividendIncome = 0;
  if (!(ais as any)._tdsDetails) (ais as any)._tdsDetails = [];

  return new Proxy(ais, {
    ownKeys() {
      return ['interestSavings', 'interestDeposit', 'dividendIncome', 'tdsDetails', 'metadata', 'profile', 'tdsTcsInfo', 'sftInfo', 'taxPayments', 'demandsAndRefunds', 'otherInfo'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'interestSavings') return (ais as any)._interestSavings;
      if (prop === 'interestDeposit') return (ais as any)._interestDeposit;
      if (prop === 'dividendIncome') return (ais as any)._dividendIncome;
      if (prop === 'tdsDetails') return (ais as any)._tdsDetails;
      if (prop === '__bundle') return ais;
      if (prop === '__isAisProxy') return true;
      return (ais as any)[prop];
    },
    set(target, prop, value) {
      if (prop === 'interestSavings') (ais as any)._interestSavings = Number(value);
      else if (prop === 'interestDeposit') (ais as any)._interestDeposit = Number(value);
      else if (prop === 'dividendIncome') (ais as any)._dividendIncome = Number(value);
      else if (prop === 'tdsDetails') (ais as any)._tdsDetails = value;
      else {
        (ais as any)[prop] = value;
      }
      return true;
    }
  });
}

export function createTisProxy(tis: any): TISData {
  if (!tis) return tis;
  if (tis.__isTisProxy) return tis;
  if ('salaryDerived' in tis) return tis;

  if (!(tis as any)._salaryDerived) (tis as any)._salaryDerived = 0;
  if (!(tis as any)._interestSavings) (tis as any)._interestSavings = 0;
  if (!(tis as any)._interestDeposit) (tis as any)._interestDeposit = 0;
  if (!(tis as any)._dividendIncome) (tis as any)._dividendIncome = 0;

  return new Proxy(tis, {
    ownKeys() {
      return ['salaryDerived', 'interestSavings', 'interestDeposit', 'dividendIncome', 'metadata', 'profile', 'categories', 'details'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'salaryDerived') return (tis as any)._salaryDerived;
      if (prop === 'interestSavings') return (tis as any)._interestSavings;
      if (prop === 'interestDeposit') return (tis as any)._interestDeposit;
      if (prop === 'dividendIncome') return (tis as any)._dividendIncome;
      if (prop === '__bundle') return tis;
      if (prop === '__isTisProxy') return true;
      return (tis as any)[prop];
    },
    set(target, prop, value) {
      if (prop === 'salaryDerived') (tis as any)._salaryDerived = Number(value);
      else if (prop === 'interestSavings') (tis as any)._interestSavings = Number(value);
      else if (prop === 'interestDeposit') (tis as any)._interestDeposit = Number(value);
      else if (prop === 'dividendIncome') (tis as any)._dividendIncome = Number(value);
      else {
        (tis as any)[prop] = value;
      }
      return true;
    }
  });
}

export function createForm26asProxy(f26: any): Form26ASData {
  if (!f26) return f26;
  if (f26.__isForm26asProxy) return f26;
  if ('tdsSalary' in f26 && !f26.hasOwnProperty('metadata')) return f26;

  return new Proxy(f26, {
    ownKeys() {
      return ['tdsSalary', 'tdsOther', 'tcsDetails', 'advanceTax', 'selfAssessmentTax', 'metadata', 'profile'];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === '__bundle') return f26;
      if (prop === '__isForm26asProxy') return true;
      return f26[prop];
    },
    set(target, prop, value) {
      f26[prop] = value;
      return true;
    }
  });
}

export function createEngineProxy(res: any): ReconciledTaxData {
  if (!res) return res;
  if (res.__isEngineProxy) return res;
  if ('salary' in res) {
    return new Proxy(res, {
      get(target, prop) {
        if (prop === '__bundle') {
          return mapFlatToEngineResult(target);
        }
        if (prop === '__isEngineProxy') return true;
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
  }

  const f16Proxy = createForm16Proxy(res.form16Data || (res.form16Data = createEmptyForm16Bundle()));

  if (!(res as any)._discrepancies) (res as any)._discrepancies = [];
  if (!(res as any)._detectedIncomeSources) (res as any)._detectedIncomeSources = [];

  const engineKeys = ['aisData', 'tisData', 'form26asData', 'taxCredits', 'discrepancies', 'detectedIncomeSources'];
  const f16Keys = [
    'employer', 'employee', 'assessmentYear', 'period', 'salary', 'otherIncome',
    'grossTotalIncome', 'deductions80C', 'deductions80CCC', 'deductions80CCD1',
    'deductions80CCD1B', 'deductions80CCD2', 'deductions80D', 'deductions80E',
    'deductions80G', 'deductions80TTA', 'totalChapterVIADeductions', 'totalIncome', 'taxPayable'
  ];

  return new Proxy(res, {
    ownKeys() {
      return [...engineKeys, ...f16Keys];
    },
    getOwnPropertyDescriptor(target, prop) {
      return { enumerable: true, configurable: true };
    },
    get(target, prop) {
      if (prop === 'form16Data' || prop === '__bundle') return res.form16Data;
      if (prop === 'aisData') return res.aisData ? createAisProxy(res.aisData) : undefined;
      if (prop === 'tisData') return res.tisData ? createTisProxy(res.tisData) : undefined;
      if (prop === 'form26asData') return res.form26asData ? createForm26asProxy(res.form26asData) : undefined;
      if (prop === 'taxCredits') return res.taxCredits;
      if (prop === 'discrepancies') return res.discrepancies || (res.discrepancies = []);
      if (prop === 'detectedIncomeSources') return res.detectedIncomeSources || (res.detectedIncomeSources = []);
      if (prop === '__isEngineProxy') return true;

      if (prop in f16Proxy || typeof prop === 'string') {
        const val = (f16Proxy as any)[prop];
        if (val !== undefined) return val;
      }

      return (res as any)[prop];
    },
    set(target, prop, value) {
      if (prop === 'aisData') res.aisData = value;
      else if (prop === 'tisData') res.tisData = value;
      else if (prop === 'form26asData') res.form26asData = value;
      else if (prop === 'taxCredits') res.taxCredits = value;
      else if (prop === 'discrepancies') res.discrepancies = value;
      else if (prop === 'detectedIncomeSources') res.detectedIncomeSources = value;
      else {
        (f16Proxy as any)[prop] = value;
      }
      return true;
    }
  });
}
