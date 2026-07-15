import { Form16Data, ITR1_JSON, ReconciledTaxData } from '../types';

export function mapForm16ToITR1(data: Form16Data): ITR1_JSON {
  const now = new Date().toISOString().split('T')[0];
  const recon = data as ReconciledTaxData;

  const credits = recon.taxCredits || {
    tdsSalary: 0,
    tdsOther: 0,
    tcs: 0,
    advanceTax: 0,
    selfAssessmentTax: 0,
  };

  const totalTDS = credits.tdsSalary + credits.tdsOther;
  const totalTaxesPaid = credits.advanceTax + totalTDS + credits.tcs + credits.selfAssessmentTax;
  const balTaxPayable = Math.max(0, data.taxPayable - totalTaxesPaid);
  const refundDue = Math.max(0, totalTaxesPaid - data.taxPayable);

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
          AssessmentYear: data.assessmentYear || '2026',
          SchemaVer: 'Ver1.0',
          FormVer: 'Ver1.0',
        },
        PersonalInfo: {
          AssesseeName: {
            FirstName: data.employee.name.firstName,
            MiddleName: data.employee.name.middleName,
            SurNameOrOrgName: data.employee.name.lastName || 'SURNAME_REQUIRED',
          },
          PAN: data.employee.pan,
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
          GrossSalary: data.salary.grossSalary,
          Salary: data.salary.salaryAsPer17_1,
          PerquisitesValue: data.salary.perquisites17_2,
          ProfitsInSalary: data.salary.profitsInLieu17_3,
          AllwncExemptUs10: {
            AllwncExemptUs10Dtls: data.salary.exemptAllowancesUs10.map(item => ({
              SalNatureDesc: item.code || item.nature || '',
              SalOthAmount: item.amount,
            })),
            TotalAllwncExemptUs10: data.salary.totalExemptAllowances,
          },
          NetSalary: data.salary.netSalary,
          DeductionUs16ia: data.salary.standardDeduction16ia,
          EntertainmentAlw16ii: data.salary.entertainmentAllowance16ii,
          ProfessionalTaxUs16iii: data.salary.professionalTax16iii,
          DeductionUs16: data.salary.totalDeductionsUs16,
          IncomeFromSal: data.salary.incomeChargeableUnderHeadSalaries,
          TotalIncomeChargeableUnHP: data.otherIncome.houseProperty,
          IncomeOthSrc: data.otherIncome.totalOtherSources,
          GrossTotIncome: data.grossTotalIncome,
          GrossTotIncomeIncLTCG112A: data.grossTotalIncome,
          DeductUndChapVIA: {
            Section80C: data.deductions80C,
            Section80CCC: data.deductions80CCC,
            Section80CCDEmployeeOrSE: data.deductions80CCD1,
            Section80CCD1B: data.deductions80CCD1B,
            Section80CCDEmployer: data.deductions80CCD2,
            Section80D: data.deductions80D,
            Section80E: data.deductions80E,
            Section80G: data.deductions80G,
            Section80TTA: data.deductions80TTA,
            TotalChapVIADeductions: data.totalChapterVIADeductions,
          },
          TotalIncome: data.totalIncome,
        },
        ITR1_TaxComputation: {
          TotalTaxPayable: data.taxPayable,
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
            AdvanceTax: credits.advanceTax,
            TDS: totalTDS,
            TCS: credits.tcs,
            SelfAssessmentTax: credits.selfAssessmentTax,
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
            AssesseeVerName: `${data.employee.name.firstName} ${data.employee.name.lastName}`.trim(),
            FatherName: 'NA',
            AssesseeVerPAN: data.employee.pan,
          },
          Capacity: 'S',
          Place: 'DELHI',
        },
      },
    },
  };
}
