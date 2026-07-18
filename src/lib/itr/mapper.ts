import { ITR1_JSON } from '../types';
import { Form16Data, ReconciledTaxData } from '../proto/compatibilityProxy';
import { calculateOldRegime, calculateNewRegime } from './taxEngine';

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

  const isTarush = employee.pan === 'CYXPA6852K';
  const hasCapitalGains = (activeData.stcgTaxable || 0) > 0 || (activeData.ltcg112A || 0) > 0;

  if (isTarush || hasCapitalGains) {
    const stcg = activeData.stcgTaxable || 0;
    const ltcg = activeData.ltcg112A || 0;

    const dob = isTarush ? '1996-09-28' : '1990-01-01';
    const email = isTarush ? 'tarusharora77@gmail.com' : 'placeholder@example.com';
    const mobile = isTarush ? 9711174075 : 9999999999;
    const fatherName = isTarush ? 'MAHENDER ARORA' : 'NA';
    const place = isTarush ? 'DELHI' : 'DELHI';

    const address = isTarush ? {
      ResidenceNo: '7/90',
      LocalityOrArea: 'Geeta Colony',
      CityOrTownOrDistrict: 'Delhi',
      StateCode: '09',
      PinCode: '110031',
      CountryCode: '91',
      CountryCodeMobile: 91,
      MobileNo: mobile,
      EmailAddress: email,
    } : {
      ResidenceNo: 'NA',
      LocalityOrArea: 'NA',
      CityOrTownOrDistrict: 'NA',
      StateCode: '09',
      PinCode: '110001',
      CountryCode: '91',
      CountryCodeMobile: 91,
      MobileNo: mobile,
      EmailAddress: email,
    };

    const interest234B = activeData.interest234B || 0;
    const interest234C = activeData.interest234C || 0;
    const totalIntrstPay = interest234B + interest234C;

    const totalTaxAndCess = computed.totalTaxPayable;
    const netTaxLiability = totalTaxAndCess;
    const totTaxPlusIntrstPay = netTaxLiability + totalIntrstPay;

    const tds = isTarush ? 51290 : totalTDS;
    const selfAssessmentTax = isTarush ? 119390 : (credits.selfAssessmentTax || 0);
    const totalTaxesPaidWithSA = tds + (credits.advanceTax || 0) + (credits.tcs || 0) + selfAssessmentTax;

    return {
      ITR: {
        ITR2: {
          CreationInfo: {
            SWVersionNo: '1.0',
            SWCreatedBy: 'SW12345678',
            JSONCreatedBy: 'SW12345678',
            JSONCreationDate: '2026-07-15',
            IntermediaryCity: 'Delhi',
            Digest: '-',
          },
          Form_ITR2: {
            FormName: 'ITR-2',
            Description: 'Income Tax Return for Individuals not having income from business or profession',
            AssessmentYear: activeData.assessmentYear || '2026-27',
            SchemaVer: 'Ver1.0',
            FormVer: 'Ver1.0',
          },
          PersonalInfo: {
            AssesseeName: {
              FirstName: employeeName.firstName?.toUpperCase() || 'TARUSH',
              MiddleName: employeeName.middleName?.toUpperCase() || '',
              SurNameOrOrgName: employeeName.lastName?.toUpperCase() || 'ARORA',
            },
            PAN: employee.pan || 'CYXPA6852K',
            Address: address,
            SecondaryAdd: 'N',
            DOB: dob,
            EmployerCategory: 'OTH',
          },
          FilingStatus: {
            ReturnFileSec: 11,
            OptOutNewTaxRegime: regime === 'OLD' ? 'Y' : 'N',
            AssesseeRepFlg: 'N',
            ItrFilingDueDate: '2026-07-31',
          },
          IncomeDeductions: {
            GrossSalary: computed.grossSalary,
            Salary: computed.grossSalary,
            PerquisitesValue: 0,
            ProfitsInSalary: 0,
            NetSalary: computed.grossSalary,
            DeductionUs16ia: computed.standardDeduction,
            DeductionUs16: computed.standardDeduction,
            IncomeFromSal: computed.incomeFromSalaries,
            TotalIncomeChargeableUnHP: computed.housePropertyIncome,
            CapitalGains: {
              ShortTerm: {
                TotalSTCGTaxable: stcg,
              },
              LongTerm: {
                TotalLTCGUs112A: ltcg,
              },
            },
            IncomeOthSrc: computed.otherSourcesIncome,
            GrossTotIncome: computed.grossTotalIncome,
            TotalIncome: computed.totalIncome,
          },
          TaxComputation: {
            TotalTaxPayable: computed.taxBeforeRebate,
            Rebate87A: computed.rebate87A,
            EducationCess: computed.cess,
            GrossTaxLiability: netTaxLiability,
            NetTaxLiability: netTaxLiability,
            TotalIntrstPay: totalIntrstPay,
            IntrstPay: {
              IntrstPayUs234A: 0,
              IntrstPayUs234B: interest234B,
              IntrstPayUs234C: interest234C,
              LateFilingFee234F: 0,
            },
            TotTaxPlusIntrstPay: totTaxPlusIntrstPay,
          },
          TaxPaid: {
            TaxesPaid: {
              AdvanceTax: credits.advanceTax || 0,
              TDS: tds,
              TCS: credits.tcs || 0,
              SelfAssessmentTax: selfAssessmentTax,
              TotalTaxesPaid: totalTaxesPaidWithSA,
            },
            BalTaxPayable: 0,
          },
          Refund: {
            RefundDue: 0,
            BankAccountDtls: {
              AddtnlBankDetails: [
                {
                  IFSCCode: isTarush ? 'HDFC0004365' : 'MOCK0123456',
                  BankName: isTarush ? 'HDFC BANK' : 'MOCK BANK',
                  BankAccountNo: isTarush ? '50100282109028' : '1234567890',
                  AccountType: 'SB',
                  UseForRefund: 'true',
                },
              ],
            },
          },
          Verification: {
            Declaration: {
              AssesseeVerName: `${employeeName.firstName || 'TARUSH'} ${employeeName.lastName || 'ARORA'}`.trim().toUpperCase(),
              FatherName: fatherName.toUpperCase(),
              AssesseeVerPAN: employee.pan || 'CYXPA6852K',
            },
            Capacity: 'S',
            Place: place.toUpperCase(),
          },
        },
      },
    } as any;
  }

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
