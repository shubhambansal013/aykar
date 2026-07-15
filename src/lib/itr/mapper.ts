import { Form16Data, ITR1_JSON, ReconciledTaxData } from '../types';

export function mapForm16ToITR1(data: Form16Data): ITR1_JSON {
  const now = new Date().toISOString().split('T')[0];
  const activeData = data || {} as Form16Data;
  const employee = activeData.employee || {};
  const employeeName = employee.name || {};
  const salary = activeData.salary || {};
  const exemptAllowancesUs10 = salary.exemptAllowancesUs10 || [];
  const otherIncome = activeData.otherIncome || {};

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
  const taxPayable = activeData.taxPayable || 0;
  const balTaxPayable = Math.max(0, taxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - taxPayable);

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
          OptOutNewTaxRegime: 'N',
          AsseseeRepFlg: 'N',
          ItrFilingDueDate: '2026-07-31',
        },
        ITR1_IncomeDeductions: {
          GrossSalary: salary.grossSalary || 0,
          Salary: salary.salaryAsPer17_1 || 0,
          PerquisitesValue: salary.perquisites17_2 || 0,
          ProfitsInSalary: salary.profitsInLieu17_3 || 0,
          AllwncExemptUs10: {
            AllwncExemptUs10Dtls: exemptAllowancesUs10.map(item => ({
              SalNatureDesc: item ? (item.code || item.nature || '') : '',
              SalOthAmount: item ? (item.amount || 0) : 0,
            })),
            TotalAllwncExemptUs10: salary.totalExemptAllowances || 0,
          },
          NetSalary: salary.netSalary || 0,
          DeductionUs16ia: salary.standardDeduction16ia || 0,
          EntertainmentAlw16ii: salary.entertainmentAllowance16ii || 0,
          ProfessionalTaxUs16iii: salary.professionalTax16iii || 0,
          DeductionUs16: salary.totalDeductionsUs16 || 0,
          IncomeFromSal: salary.incomeChargeableUnderHeadSalaries || 0,
          TotalIncomeChargeableUnHP: otherIncome.houseProperty || 0,
          IncomeOthSrc: otherIncome.totalOtherSources || 0,
          GrossTotIncome: activeData.grossTotalIncome || 0,
          GrossTotIncomeIncLTCG112A: activeData.grossTotalIncome || 0,
          DeductUndChapVIA: {
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
          },
          TotalIncome: activeData.totalIncome || 0,
        },
        ITR1_TaxComputation: {
          TotalTaxPayable: taxPayable,
          Rebate87A: 0,
          TaxPayableOnRebate: 0,
          EducationCess: 0,
          GrossTaxLiability: 0,
          Section89: 0,
          NetTaxLiability: 0,
          TotalIntrstPay: 0,
          IntrstPay: {
            IntrstPayUs234A: 0,
            IntrstPayUs234B: 0,
            IntrstPayUs234C: 0,
            LateFilingFee234F: 0,
          },
          TotTaxPlusIntrstPay: 0,
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
