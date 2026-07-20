import { ITR1_JSON, ITR2_JSON, ITR_ANY_JSON } from '../types';
import { Form16Data, ReconciledTaxData, createForm16Proxy } from '../proto/compatibilityProxy';
import { calculateOldRegime, calculateNewRegime } from './taxEngine';

/**
 * Determines whether to use ITR-1 or ITR-2 automatically based on:
 * 1. Presence of Capital Gains (STCG or LTCG)
 * 2. Presence of Multiple Employers (form16List has length > 1)
 */
export function shouldUseITR2(data: Form16Data, form16ListLength: number = 1): boolean {
  const activeData = data || {} as Form16Data;
  const hasCapitalGains = (activeData.shortTermCapitalGains || 0) > 0 || (activeData.longTermCapitalGains112A || 0) > 0;
  const hasMultipleEmployers = form16ListLength > 1;
  return hasCapitalGains || hasMultipleEmployers;
}

/**
 * Unified ITR mapping entry point that automatically decides between ITR-1 and ITR-2.
 */
export function mapToITR(data: Form16Data, regime: 'OLD' | 'NEW' = 'NEW', form16List?: any[]): ITR_ANY_JSON {
  const listLen = form16List ? form16List.length : 1;
  if (shouldUseITR2(data, listLen)) {
    return mapToITR2(data, regime, form16List);
  }
  return mapForm16ToITR1(data, regime);
}

/**
 * Maps reconciled tax data to ITR-1 JSON.
 */
export function mapForm16ToITR1(data: Form16Data, regime: 'OLD' | 'NEW' = 'NEW'): ITR1_JSON {
  const now = new Date().toISOString().split('T')[0];
  const activeData = data || {} as Form16Data;
  const employee = activeData.employee || {};
  const employeeName = employee.name || {};
  const salary = activeData.salary || {};
  const otherIncome = activeData.otherIncome || {};

  // Compute regime-specific values using our Tax Engine
  const computed = regime === 'NEW' ? calculateNewRegime(activeData) : calculateOldRegime(activeData);

  const recon = activeData as ReconciledTaxData;
  const credits = recon.taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };

  const totalTDS = (credits.tdsSalary || 0) + (credits.tdsOther || 0);
  const totalTaxesPaid = (credits.advanceTax || 0) + totalTDS + (credits.tcs || 0) + (credits.selfAssessmentTax || 0);
  const taxPayable = computed.totalTaxPayable;
  const balTaxPayable = Math.max(0, taxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - taxPayable);

  // Set up exempt allowances based on regime
  const exemptAllowancesUs10 = regime === 'OLD' ? (salary.exemptAllowancesUs10 || []) : [];
  const totalExemptAllowances = regime === 'OLD' ? (salary.totalExemptAllowances || 0) : 0;

  // Set up Chapter VI-A deductions based on regime
  const DeductUndChapVIA = regime === 'OLD' ? {
    Section80C: activeData.deductions80C || 0,
    Section80CCC: activeData.deductions80CCC || 0,
    Section80CCDEmployeeOrSE: activeData.deductions80CCD1 || 0,
    Section80CCD1B: activeData.deductions80CCD1B || 0,
    Section80CCDEmployer: activeData.deductions80CCD2 || 0,
    Section80D: activeData.deductions80D || 0,
    Section80E: activeData.deductions80E || 0,
    Section80G: activeData.deductions80G || 0,
    Section80TTA: activeData.deductions80TTA || 0,
    TotalChapVIADeductions: activeData.totalChapterVIADeductions || 0,
  } : {
    Section80C: 0,
    Section80CCC: 0,
    Section80CCDEmployeeOrSE: 0,
    Section80CCD1B: 0,
    Section80CCDEmployer: activeData.deductions80CCD2 || 0,
    Section80D: 0,
    Section80E: 0,
    Section80G: 0,
    Section80TTA: 0,
    TotalChapVIADeductions: activeData.deductions80CCD2 || 0,
  };

  return {
    ITR: {
      ITR1: {
        CreationInfo: {
          SWVersionNo: '1.0',
          SWCreatedBy: 'SW12345678', // Placeholder
          JSONCreatedBy: 'SW12345678',
          JSONCreationDate: now,
          IntermediaryCity: 'Delhi',
          Digest: '-',
        },
        Form_ITR1: {
          FormName: 'ITR-1',
          Description: 'Income Tax Return for Individuals',
          AssessmentYear: activeData.assessmentYear || '2026',
          SchemaVer: 'Ver1.0',
          FormVer: 'Ver1.0',
        },
        PersonalInfo: {
          AssesseeName: {
            FirstName: employeeName.firstName || '',
            MiddleName: employeeName.middleName || '',
            SurNameOrOrgName: employeeName.lastName || 'SURNAME_REQUIRED',
          },
          PAN: employee.pan || '',
          Address: {
            ResidenceNo: 'NA',
            LocalityOrArea: 'NA',
            CityOrTownOrDistrict: 'NA',
            StateCode: '09', // Default Delhi
            CountryCode: '91',
            CountryCodeMobile: 91,
            MobileNo: 9999999999,
            EmailAddress: 'placeholder@example.com',
          },
          SecondaryAdd: 'N',
          DOB: '1990-01-01', // Placeholder
          EmployerCategory: 'OTH',
        },
        FilingStatus: {
          ReturnFileSec: 11,
          OptOutNewTaxRegime: regime === 'OLD' ? 'Y' : 'N',
          AsseseeRepFlg: 'N',
          ItrFilingDueDate: '2026-07-31',
        },
        ITR1_IncomeDeductions: {
          GrossSalary: computed.grossSalary,
          Salary: salary.salaryAsPer17_1 || 0,
          PerquisitesValue: salary.perquisites17_2 || 0,
          ProfitsInSalary: salary.profitsInLieu17_3 || 0,
          AllwncExemptUs10: {
            AllwncExemptUs10Dtls: exemptAllowancesUs10.map(item => ({
              SalNatureDesc: item ? (item.code || item.nature || '') : '',
              SalOthAmount: item ? (item.amount || 0) : 0,
            })),
            TotalAllwncExemptUs10: totalExemptAllowances,
          },
          NetSalary: computed.netSalary,
          DeductionUs16ia: computed.standardDeduction,
          EntertainmentAlw16ii: regime === 'OLD' ? (salary.entertainmentAllowance16ii || 0) : 0,
          ProfessionalTaxUs16iii: regime === 'OLD' ? (salary.professionalTax16iii || 0) : 0,
          DeductionUs16: computed.standardDeduction + (regime === 'OLD' ? (salary.entertainmentAllowance16ii || 0) + (salary.professionalTax16iii || 0) : 0),
          IncomeFromSal: computed.incomeFromSalaries,
          TotalIncomeChargeableUnHP: computed.housePropertyIncome,
          IncomeOthSrc: computed.otherSourcesIncome,
          GrossTotIncome: computed.grossTotalIncome,
          GrossTotIncomeIncLTCG112A: computed.grossTotalIncome,
          DeductUndChapVIA,
          TotalIncome: computed.totalIncome,
        },
        ITR1_TaxComputation: {
          TotalTaxPayable: taxPayable,
          Rebate87A: computed.rebate87A,
          TaxPayableOnRebate: 0,
          EducationCess: computed.cess,
          GrossTaxLiability: computed.taxBeforeRebate,
          Section89: 0,
          NetTaxLiability: taxPayable,
          TotalIntrstPay: 0,
          IntrstPay: {
            IntrstPayUs234A: 0,
            IntrstPayUs234B: 0,
            IntrstPayUs234C: 0,
            LateFilingFee234F: 0,
          },
          TotTaxPlusIntrstPay: taxPayable,
        },
        TaxPaid: {
          TaxesPaid: {
            AdvanceTax: credits.advanceTax || 0,
            TDS: totalTDS,
            TCS: credits.tcs || 0,
            SelfAssessmentTax: credits.selfAssessmentTax || 0,
            TotalTaxesPaid: totalTaxesPaid,
          },
          BalTaxPayable: balTaxPayable,
        },
        Refund: {
          RefundDue: refundDue,
          BankAccountDtls: {
            AddtnlBankDetails: [{
              IFSCCode: 'ABCD0123456',
              BankName: 'MOCK BANK',
              BankAccountNo: '1234567890',
              AccountType: 'SB',
              UseForRefund: 'true'
            }]
          },
        },
        Verification: {
          Declaration: {
            AssesseeVerName: `${employeeName.firstName || ''} ${employeeName.lastName || ''}`.trim(),
            FatherName: 'NA',
            AssesseeVerPAN: employee.pan || '',
          },
          Capacity: 'S',
          Place: 'DELHI',
        },
      },
    },
  };
}

/**
 * Maps reconciled tax data to ITR-2 JSON.
 */
export function mapToITR2(data: Form16Data, regime: 'OLD' | 'NEW' = 'NEW', form16List?: any[]): ITR2_JSON {
  const now = new Date().toISOString().split('T')[0];
  const activeData = data || {} as Form16Data;
  const employee = activeData.employee || {};
  const employeeName = employee.name || {};
  const salary = activeData.salary || {};
  const otherIncome = activeData.otherIncome || {};

  // Compute regime-specific values using our Tax Engine
  const computed = regime === 'NEW' ? calculateNewRegime(activeData) : calculateOldRegime(activeData);

  const recon = activeData as ReconciledTaxData;
  const credits = recon.taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };

  const totalTDS = (credits.tdsSalary || 0) + (credits.tdsOther || 0);
  const totalTaxesPaid = (credits.advanceTax || 0) + totalTDS + (credits.tcs || 0) + (credits.selfAssessmentTax || 0);
  const taxPayable = computed.totalTaxPayable;
  const balTaxPayable = Math.max(0, taxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - taxPayable);

  // Set up exempt allowances based on regime
  const exemptAllowancesUs10 = regime === 'OLD' ? (salary.exemptAllowancesUs10 || []) : [];
  const totalExemptAllowances = regime === 'OLD' ? (salary.totalExemptAllowances || 0) : 0;

  // Set up Chapter VI-A deductions based on regime
  const DeductUndChapVIA = regime === 'OLD' ? {
    Section80C: activeData.deductions80C || 0,
    Section80CCC: activeData.deductions80CCC || 0,
    Section80CCDEmployeeOrSE: activeData.deductions80CCD1 || 0,
    Section80CCD1B: activeData.deductions80CCD1B || 0,
    Section80CCDEmployer: activeData.deductions80CCD2 || 0,
    Section80D: activeData.deductions80D || 0,
    Section80E: activeData.deductions80E || 0,
    Section80G: activeData.deductions80G || 0,
    Section80TTA: activeData.deductions80TTA || 0,
    TotalChapVIADeductions: activeData.totalChapterVIADeductions || 0,
  } : {
    Section80C: 0,
    Section80CCC: 0,
    Section80CCDEmployeeOrSE: 0,
    Section80CCD1B: 0,
    Section80CCDEmployer: activeData.deductions80CCD2 || 0,
    Section80D: 0,
    Section80E: 0,
    Section80G: 0,
    Section80TTA: 0,
    TotalChapVIADeductions: activeData.deductions80CCD2 || 0,
  };

  // Build Schedule S (Multi-Employer Details)
  let Details: Array<{
    EmployerName: string;
    EmployerTAN: string;
    EmployerPAN: string;
    Address: string;
    SalaryUs171: number;
    PerquisitesUs172: number;
    ProfitsInSalaryUs173: number;
    AllwncExemptUs10: {
      AllwncExemptUs10Dtls: Array<{ SalNatureDesc: string; SalOthAmount: number }>;
      TotalAllwncExemptUs10: number;
    };
    NetSalary: number;
    DeductionUs16ia: number;
    EntertainmentAlw16ii: number;
    ProfessionalTaxUs16iii: number;
    DeductionUs16: number;
    IncomeFromSal: number;
  }> = [];

  if (form16List && form16List.length > 0) {
    Details = form16List.map((item) => {
      const docProxy = item.data ? createForm16Proxy(item.data) : (item as any);
      const emp = docProxy.employer || {};
      const sal = docProxy.salary || {};

      const empExemptUs10 = regime === 'OLD' ? (sal.exemptAllowancesUs10 || []) : [];
      const empTotalExempt = regime === 'OLD' ? (sal.totalExemptAllowances || 0) : 0;
      const empNetSalary = Math.max(0, (sal.grossSalary || 0) - empTotalExempt);

      const empStdDed = regime === 'NEW' ? 50000 : (sal.standardDeduction16ia || 0);
      const empOtherDed = regime === 'OLD' ? (sal.entertainmentAllowance16ii || 0) + (sal.professionalTax16iii || 0) : 0;
      const empTotalDed = empStdDed + empOtherDed;
      const empIncomeFromSal = Math.max(0, empNetSalary - empTotalDed);

      return {
        EmployerName: emp.name || 'UNKNOWN EMPLOYER',
        EmployerTAN: emp.tan || 'NA',
        EmployerPAN: emp.pan || 'NA',
        Address: emp.address || 'NA',
        SalaryUs171: sal.salaryAsPer17_1 || 0,
        PerquisitesUs172: sal.perquisites17_2 || 0,
        ProfitsInSalaryUs173: sal.profitsInLieu17_3 || 0,
        AllwncExemptUs10: {
          AllwncExemptUs10Dtls: empExemptUs10.map((x: any) => ({
            SalNatureDesc: x ? (x.code || x.nature || '') : '',
            SalOthAmount: x ? (x.amount || 0) : 0,
          })),
          TotalAllwncExemptUs10: empTotalExempt,
        },
        NetSalary: empNetSalary,
        DeductionUs16ia: empStdDed,
        EntertainmentAlw16ii: regime === 'OLD' ? (sal.entertainmentAllowance16ii || 0) : 0,
        ProfessionalTaxUs16iii: regime === 'OLD' ? (sal.professionalTax16iii || 0) : 0,
        DeductionUs16: empTotalDed,
        IncomeFromSal: empIncomeFromSal,
      };
    });
  } else {
    // Fall back to main reconciled data
    Details = [{
      EmployerName: activeData.employer?.name || 'UNKNOWN EMPLOYER',
      EmployerTAN: activeData.employer?.tan || 'NA',
      EmployerPAN: activeData.employer?.pan || 'NA',
      Address: activeData.employer?.address || 'NA',
      SalaryUs171: salary.salaryAsPer17_1 || 0,
      PerquisitesUs172: salary.perquisites17_2 || 0,
      ProfitsInSalaryUs173: salary.profitsInLieu17_3 || 0,
      AllwncExemptUs10: {
        AllwncExemptUs10Dtls: exemptAllowancesUs10.map(item => ({
          SalNatureDesc: item ? (item.code || item.nature || '') : '',
          SalOthAmount: item ? (item.amount || 0) : 0,
        })),
        TotalAllwncExemptUs10: totalExemptAllowances,
      },
      NetSalary: computed.netSalary,
      DeductionUs16ia: computed.standardDeduction,
      EntertainmentAlw16ii: regime === 'OLD' ? (salary.entertainmentAllowance16ii || 0) : 0,
      ProfessionalTaxUs16iii: regime === 'OLD' ? (salary.professionalTax16iii || 0) : 0,
      DeductionUs16: computed.standardDeduction + (regime === 'OLD' ? (salary.entertainmentAllowance16ii || 0) + (salary.professionalTax16iii || 0) : 0),
      IncomeFromSal: computed.incomeFromSalaries,
    }];
  }

  const TotalSalaries = Details.reduce((sum, item) => sum + item.IncomeFromSal, 0);

  // Build Schedule CG (Capital Gains)
  const ScheduleCG = {
    ShortTermCapitalGains: activeData.shortTermCapitalGains || 0,
    LongTermCapitalGains112A: activeData.longTermCapitalGains112A || 0,
  };

  // Build Schedule OS (Other Sources)
  const aisData = (activeData as any).aisData;
  const tisData = (activeData as any).tisData;

  const InterestSavings = Math.max(aisData?.interestSavings || 0, tisData?.interestSavings || 0);
  const InterestDeposit = Math.max(aisData?.interestDeposit || 0, tisData?.interestDeposit || 0);
  const DividendIncome = Math.max(aisData?.dividendIncome || 0, tisData?.dividendIncome || 0);
  const TotalIncomeOthSrc = otherIncome.totalOtherSources || 0;
  const OtherSourceDetails = (otherIncome.otherSources || []).map((x: any) => ({
    Nature: x ? (x.nature || '') : '',
    Amount: x ? (x.amount || 0) : 0,
  }));

  const ScheduleOS = {
    InterestSavings,
    InterestDeposit,
    DividendIncome,
    TotalIncomeOthSrc,
    OtherSourceDetails,
  };

  return {
    ITR: {
      ITR2: {
        CreationInfo: {
          SWVersionNo: '1.0',
          SWCreatedBy: 'SW12345678', // Placeholder
          JSONCreatedBy: 'SW12345678',
          JSONCreationDate: now,
          IntermediaryCity: 'Delhi',
          Digest: '-',
        },
        Form_ITR2: {
          FormName: 'ITR-2',
          Description: 'Income Tax Return for Individuals',
          AssessmentYear: activeData.assessmentYear || '2026',
          SchemaVer: 'Ver1.0',
          FormVer: 'Ver1.0',
        },
        PersonalInfo: {
          AssesseeName: {
            FirstName: employeeName.firstName || '',
            MiddleName: employeeName.middleName || '',
            SurNameOrOrgName: employeeName.lastName || 'SURNAME_REQUIRED',
          },
          PAN: employee.pan || '',
          Address: {
            ResidenceNo: 'NA',
            LocalityOrArea: 'NA',
            CityOrTownOrDistrict: 'NA',
            StateCode: '09', // Default Delhi
            CountryCode: '91',
            CountryCodeMobile: 91,
            MobileNo: 9999999999,
            EmailAddress: 'placeholder@example.com',
          },
          SecondaryAdd: 'N',
          DOB: '1990-01-01', // Placeholder
          EmployerCategory: 'OTH',
        },
        FilingStatus: {
          ReturnFileSec: 11,
          OptOutNewTaxRegime: regime === 'OLD' ? 'Y' : 'N',
          AsseseeRepFlg: 'N',
          ItrFilingDueDate: '2026-07-31',
        },
        ScheduleS: {
          Details,
          TotalSalaries,
        },
        ScheduleCG,
        ScheduleOS,
        DeductUndChapVIA,
        ITR2_TaxComputation: {
          TotalTaxPayable: taxPayable,
          Rebate87A: computed.rebate87A,
          TaxPayableOnRebate: 0,
          EducationCess: computed.cess,
          GrossTaxLiability: computed.taxBeforeRebate,
          Section89: 0,
          NetTaxLiability: taxPayable,
          TotalIntrstPay: 0,
          IntrstPay: {
            IntrstPayUs234A: 0,
            IntrstPayUs234B: 0,
            IntrstPayUs234C: 0,
            LateFilingFee234F: 0,
          },
          TotTaxPlusIntrstPay: taxPayable,
        },
        TaxPaid: {
          TaxesPaid: {
            AdvanceTax: credits.advanceTax || 0,
            TDS: totalTDS,
            TCS: credits.tcs || 0,
            SelfAssessmentTax: credits.selfAssessmentTax || 0,
            TotalTaxesPaid: totalTaxesPaid,
          },
          BalTaxPayable: balTaxPayable,
        },
        Refund: {
          RefundDue: refundDue,
          BankAccountDtls: {
            AddtnlBankDetails: [{
              IFSCCode: 'ABCD0123456',
              BankName: 'MOCK BANK',
              BankAccountNo: '1234567890',
              AccountType: 'SB',
              UseForRefund: 'true'
            }]
          },
        },
        Verification: {
          Declaration: {
            AssesseeVerName: `${employeeName.firstName || ''} ${employeeName.lastName || ''}`.trim(),
            FatherName: 'NA',
            AssesseeVerPAN: employee.pan || '',
          },
          Capacity: 'S',
          Place: 'DELHI',
        },
      },
    },
  };
}
