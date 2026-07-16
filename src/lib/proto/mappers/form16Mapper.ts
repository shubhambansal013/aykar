import { Form16Data } from '../../types';
import { Form16Bundle, Form16 } from '../../../generated/sources/form16';

export class Form16Mapper {
  static toProto(data: Form16Data): Form16Bundle {
    const firstName = data.employee?.name?.firstName || '';
    const middleName = data.employee?.name?.middleName || '';
    const lastName = data.employee?.name?.lastName || '';
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

    const certificate: Form16 = {
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
        section10Exemptions: (data.salary?.exemptAllowancesUs10 || []).map(x => ({
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

  static toDomain(bundle: Form16Bundle): Form16Data {
    const cert = bundle.certificates?.[0];
    const names = bundle.taxpayerProfile?.name?.split(' ') || [];
    const firstName = names[0] || '';
    const middleName = names.length > 2 ? names.slice(1, -1).join(' ') : '';
    const lastName = names.length > 1 ? names[names.length - 1] : '';

    return {
      employer: {
        name: cert?.employerProfile?.name || '',
        tan: cert?.employerProfile?.tan || '',
        pan: cert?.employerProfile?.pan || '',
        address: cert?.employerProfile?.address || '',
      },
      employee: {
        name: { firstName, middleName, lastName },
        pan: bundle.taxpayerProfile?.pan || '',
        address: bundle.taxpayerProfile?.address || '',
      },
      assessmentYear: cert?.employmentPeriod?.assessmentYear || '',
      period: {
        from: cert?.employmentPeriod?.startDate || '',
        to: cert?.employmentPeriod?.endDate || '',
      },
      salary: {
        grossSalary: cert?.partB?.totalGrossSalary || 0,
        salaryAsPer17_1: cert?.partB?.salaryUs171 || 0,
        perquisites17_2: cert?.partB?.perquisitesUs172 || 0,
        profitsInLieu17_3: cert?.partB?.profitsInLieuUs173 || 0,
        exemptAllowancesUs10: (cert?.partB?.section10Exemptions || []).map(x => ({
          code: x.sectionCode,
          nature: x.description,
          amount: x.amount,
        })),
        totalExemptAllowances: cert?.partB?.totalSection10Exemptions || 0,
        netSalary: cert?.partB?.incomeChargeableUnderSalaries ? cert.partB.incomeChargeableUnderSalaries + (cert.partB.totalSection16Deductions || 0) : 0,
        standardDeduction16ia: cert?.partB?.standardDeduction || 0,
        entertainmentAllowance16ii: cert?.partB?.entertainmentAllowance || 0,
        professionalTax16iii: cert?.partB?.professionalTax || 0,
        totalDeductionsUs16: cert?.partB?.totalSection16Deductions || 0,
        incomeChargeableUnderHeadSalaries: cert?.partB?.incomeChargeableUnderSalaries || 0,
      },
      otherIncome: {
        houseProperty: cert?.partB?.incomeFromHousePropertyReported || 0,
        otherSources: [],
        totalOtherSources: cert?.partB?.incomeFromOtherSourcesReported || 0,
      },
      grossTotalIncome: cert?.partB?.grossTotalIncome || 0,
      deductions80C: cert?.partB?.chapterViaDeductions?.sec80C?.deductibleAmount || 0,
      deductions80CCC: cert?.partB?.chapterViaDeductions?.sec80CCC?.deductibleAmount || 0,
      deductions80CCD1: cert?.partB?.chapterViaDeductions?.sec80CCD1?.deductibleAmount || 0,
      deductions80CCD1B: cert?.partB?.chapterViaDeductions?.sec80CCD1B?.deductibleAmount || 0,
      deductions80CCD2: cert?.partB?.chapterViaDeductions?.sec80CCD2?.deductibleAmount || 0,
      deductions80D: cert?.partB?.chapterViaDeductions?.sec80D?.deductibleAmount || 0,
      deductions80E: cert?.partB?.chapterViaDeductions?.sec80E?.deductibleAmount || 0,
      deductions80G: cert?.partB?.chapterViaDeductions?.sec80G?.deductibleAmount || 0,
      deductions80TTA: cert?.partB?.chapterViaDeductions?.sec80TTA?.deductibleAmount || 0,
      totalChapterVIADeductions: cert?.partB?.totalChapterViaDeductions || 0,
      totalIncome: cert?.partB?.totalTaxableIncome || 0,
      taxPayable: cert?.partB?.taxPayable || 0,
    };
  }
}
