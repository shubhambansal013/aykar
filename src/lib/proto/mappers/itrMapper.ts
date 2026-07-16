import { ITR1_JSON } from '../../types';
import { ItrJson } from '../../../generated/platform/itr';

export class ItrMapper {
  static toProto(data: ITR1_JSON): ItrJson {
    const itr1 = data.ITR?.ITR1;
    return {
      ITR: {
        ITR1: {
          CreationInfo: {
            SWVersionNo: itr1?.CreationInfo?.SWVersionNo || '',
            SWCreatedBy: itr1?.CreationInfo?.SWCreatedBy || '',
            JSONCreatedBy: itr1?.CreationInfo?.JSONCreatedBy || '',
            JSONCreationDate: itr1?.CreationInfo?.JSONCreationDate || '',
            IntermediaryCity: itr1?.CreationInfo?.IntermediaryCity || '',
            Digest: itr1?.CreationInfo?.Digest || '',
          },
          FormITR1: {
            FormName: itr1?.Form_ITR1?.FormName || '',
            Description: itr1?.Form_ITR1?.Description || '',
            AssessmentYear: itr1?.Form_ITR1?.AssessmentYear || '',
            SchemaVer: itr1?.Form_ITR1?.SchemaVer || '',
            FormVer: itr1?.Form_ITR1?.FormVer || '',
          },
          PersonalInfo: {
            AssesseeName: {
              FirstName: itr1?.PersonalInfo?.AssesseeName?.FirstName,
              MiddleName: itr1?.PersonalInfo?.AssesseeName?.MiddleName,
              SurNameOrOrgName: itr1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || '',
            },
            PAN: itr1?.PersonalInfo?.PAN || '',
            Address: typeof itr1?.PersonalInfo?.Address === 'string' ? itr1.PersonalInfo.Address : JSON.stringify(itr1?.PersonalInfo?.Address || {}),
            SecondaryAdd: itr1?.PersonalInfo?.SecondaryAdd || 'N',
            DOB: itr1?.PersonalInfo?.DOB || '',
            EmployerCategory: itr1?.PersonalInfo?.EmployerCategory || '',
          },
          FilingStatus: {
            ReturnFileSec: itr1?.FilingStatus?.ReturnFileSec || 0,
            OptOutNewTaxRegime: itr1?.FilingStatus?.OptOutNewTaxRegime || 'N',
            AsseseeRepFlg: itr1?.FilingStatus?.AsseseeRepFlg || 'N',
            ItrFilingDueDate: itr1?.FilingStatus?.ItrFilingDueDate || '',
          },
          ITR1IncomeDeductions: {
            GrossSalary: itr1?.ITR1_IncomeDeductions?.GrossSalary || 0,
            Salary: itr1?.ITR1_IncomeDeductions?.Salary || 0,
            PerquisitesValue: itr1?.ITR1_IncomeDeductions?.PerquisitesValue || 0,
            ProfitsInSalary: itr1?.ITR1_IncomeDeductions?.ProfitsInSalary || 0,
            AllwncExemptUs10: {
              AllwncExemptUs10Dtls: (itr1?.ITR1_IncomeDeductions?.AllwncExemptUs10?.AllwncExemptUs10Dtls || []).map(x => ({
                SalNatureDesc: x.SalNatureDesc,
                SalOthAmount: x.SalOthAmount,
              })),
              TotalAllwncExemptUs10: itr1?.ITR1_IncomeDeductions?.AllwncExemptUs10?.TotalAllwncExemptUs10 || 0,
            },
            NetSalary: itr1?.ITR1_IncomeDeductions?.NetSalary || 0,
            DeductionUs16ia: itr1?.ITR1_IncomeDeductions?.DeductionUs16ia || 0,
            EntertainmentAlw16ii: itr1?.ITR1_IncomeDeductions?.EntertainmentAlw16ii || 0,
            ProfessionalTaxUs16iii: itr1?.ITR1_IncomeDeductions?.ProfessionalTaxUs16iii || 0,
            DeductionUs16: itr1?.ITR1_IncomeDeductions?.DeductionUs16 || 0,
            IncomeFromSal: itr1?.ITR1_IncomeDeductions?.IncomeFromSal || 0,
            TotalIncomeChargeableUnHP: itr1?.ITR1_IncomeDeductions?.TotalIncomeChargeableUnHP || 0,
            IncomeOthSrc: itr1?.ITR1_IncomeDeductions?.IncomeOthSrc || 0,
            GrossTotIncome: itr1?.ITR1_IncomeDeductions?.GrossTotIncome || 0,
            GrossTotIncomeIncLTCG112A: itr1?.ITR1_IncomeDeductions?.GrossTotIncomeIncLTCG112A || 0,
            DeductUndChapVIA: {
              Section80C: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80C || 0,
              Section80CCC: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80CCC || 0,
              Section80CCDEmployeeOrSE: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80CCDEmployeeOrSE || 0,
              Section80CCD1B: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80CCD1B || 0,
              Section80CCDEmployer: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80CCDEmployer || 0,
              Section80D: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80D || 0,
              Section80E: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80E || 0,
              Section80G: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80G || 0,
              Section80TTA: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.Section80TTA || 0,
              TotalChapVIADeductions: itr1?.ITR1_IncomeDeductions?.DeductUndChapVIA?.TotalChapVIADeductions || 0,
            },
            TotalIncome: itr1?.ITR1_IncomeDeductions?.TotalIncome || 0,
          },
          ITR1TaxComputation: {
            TotalTaxPayable: itr1?.ITR1_TaxComputation?.TotalTaxPayable || 0,
            Rebate87A: itr1?.ITR1_TaxComputation?.Rebate87A || 0,
            TaxPayableOnRebate: itr1?.ITR1_TaxComputation?.TaxPayableOnRebate || 0,
            EducationCess: itr1?.ITR1_TaxComputation?.EducationCess || 0,
            GrossTaxLiability: itr1?.ITR1_TaxComputation?.GrossTaxLiability || 0,
            Section89: itr1?.ITR1_TaxComputation?.Section89 || 0,
            NetTaxLiability: itr1?.ITR1_TaxComputation?.NetTaxLiability || 0,
            TotalIntrstPay: itr1?.ITR1_TaxComputation?.TotalIntrstPay || 0,
            IntrstPay: {
              IntrstPayUs234A: itr1?.ITR1_TaxComputation?.IntrstPay?.IntrstPayUs234A || 0,
              IntrstPayUs234B: itr1?.ITR1_TaxComputation?.IntrstPay?.IntrstPayUs234B || 0,
              IntrstPayUs234C: itr1?.ITR1_TaxComputation?.IntrstPay?.IntrstPayUs234C || 0,
              LateFilingFee234F: itr1?.ITR1_TaxComputation?.IntrstPay?.LateFilingFee234F || 0,
            },
            TotTaxPlusIntrstPay: itr1?.ITR1_TaxComputation?.TotTaxPlusIntrstPay || 0,
          },
          TaxPaid: {
            TaxesPaid: {
              AdvanceTax: itr1?.TaxPaid?.TaxesPaid?.AdvanceTax || 0,
              TDS: itr1?.TaxPaid?.TaxesPaid?.TDS || 0,
              TCS: itr1?.TaxPaid?.TaxesPaid?.TCS || 0,
              SelfAssessmentTax: itr1?.TaxPaid?.TaxesPaid?.SelfAssessmentTax || 0,
              TotalTaxesPaid: itr1?.TaxPaid?.TaxesPaid?.TotalTaxesPaid || 0,
            },
            BalTaxPayable: itr1?.TaxPaid?.BalTaxPayable || 0,
          },
          Refund: {
            RefundDue: itr1?.Refund?.RefundDue || 0,
            BankAccountDtls: typeof itr1?.Refund?.BankAccountDtls === 'string' ? itr1.Refund.BankAccountDtls : JSON.stringify(itr1?.Refund?.BankAccountDtls || {}),
          },
          Verification: {
            Declaration: {
              AssesseeVerName: itr1?.Verification?.Declaration?.AssesseeVerName || '',
              FatherName: itr1?.Verification?.Declaration?.FatherName || '',
              AssesseeVerPAN: itr1?.Verification?.Declaration?.AssesseeVerPAN || '',
            },
            Capacity: itr1?.Verification?.Capacity || 'S',
            Place: itr1?.Verification?.Place || '',
          },
        },
      },
    };
  }

  static toDomain(proto: ItrJson): ITR1_JSON {
    const itr1 = proto.ITR?.ITR1;
    let parsedAddress: any = {};
    try {
      if (itr1?.PersonalInfo?.Address) {
        parsedAddress = JSON.parse(itr1.PersonalInfo.Address);
      }
    } catch {
      parsedAddress = itr1?.PersonalInfo?.Address || '';
    }

    let parsedBank: any = {};
    try {
      if (itr1?.Refund?.BankAccountDtls) {
        parsedBank = JSON.parse(itr1.Refund.BankAccountDtls);
      }
    } catch {
      parsedBank = itr1?.Refund?.BankAccountDtls || '';
    }

    return {
      ITR: {
        ITR1: {
          CreationInfo: {
            SWVersionNo: itr1?.CreationInfo?.SWVersionNo || '',
            SWCreatedBy: itr1?.CreationInfo?.SWCreatedBy || '',
            JSONCreatedBy: itr1?.CreationInfo?.JSONCreatedBy || '',
            JSONCreationDate: itr1?.CreationInfo?.JSONCreationDate || '',
            IntermediaryCity: itr1?.CreationInfo?.IntermediaryCity || '',
            Digest: itr1?.CreationInfo?.Digest || '',
          },
          Form_ITR1: {
            FormName: itr1?.FormITR1?.FormName || '',
            Description: itr1?.FormITR1?.Description || '',
            AssessmentYear: itr1?.FormITR1?.AssessmentYear || '',
            SchemaVer: itr1?.FormITR1?.SchemaVer || '',
            FormVer: itr1?.FormITR1?.FormVer || '',
          },
          PersonalInfo: {
            AssesseeName: {
              FirstName: itr1?.PersonalInfo?.AssesseeName?.FirstName,
              MiddleName: itr1?.PersonalInfo?.AssesseeName?.MiddleName,
              SurNameOrOrgName: itr1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || '',
            },
            PAN: itr1?.PersonalInfo?.PAN || '',
            Address: parsedAddress,
            SecondaryAdd: (itr1?.PersonalInfo?.SecondaryAdd as 'Y' | 'N') || 'N',
            DOB: itr1?.PersonalInfo?.DOB || '',
            EmployerCategory: itr1?.PersonalInfo?.EmployerCategory || '',
          },
          FilingStatus: {
            ReturnFileSec: itr1?.FilingStatus?.ReturnFileSec || 0,
            OptOutNewTaxRegime: (itr1?.FilingStatus?.OptOutNewTaxRegime as 'Y' | 'N') || 'N',
            AsseseeRepFlg: (itr1?.FilingStatus?.AsseseeRepFlg as 'Y' | 'N') || 'N',
            ItrFilingDueDate: itr1?.FilingStatus?.ItrFilingDueDate || '',
          },
          ITR1_IncomeDeductions: {
            GrossSalary: itr1?.ITR1IncomeDeductions?.GrossSalary || 0,
            Salary: itr1?.ITR1IncomeDeductions?.Salary || 0,
            PerquisitesValue: itr1?.ITR1IncomeDeductions?.PerquisitesValue || 0,
            ProfitsInSalary: itr1?.ITR1IncomeDeductions?.ProfitsInSalary || 0,
            AllwncExemptUs10: {
              AllwncExemptUs10Dtls: (itr1?.ITR1IncomeDeductions?.AllwncExemptUs10?.AllwncExemptUs10Dtls || []).map(x => ({
                SalNatureDesc: x.SalNatureDesc,
                SalOthAmount: x.SalOthAmount,
              })),
              TotalAllwncExemptUs10: itr1?.ITR1IncomeDeductions?.AllwncExemptUs10?.TotalAllwncExemptUs10 || 0,
            },
            NetSalary: itr1?.ITR1IncomeDeductions?.NetSalary || 0,
            DeductionUs16ia: itr1?.ITR1IncomeDeductions?.DeductionUs16ia || 0,
            EntertainmentAlw16ii: itr1?.ITR1IncomeDeductions?.EntertainmentAlw16ii || 0,
            ProfessionalTaxUs16iii: itr1?.ITR1IncomeDeductions?.ProfessionalTaxUs16iii || 0,
            DeductionUs16: itr1?.ITR1IncomeDeductions?.DeductionUs16 || 0,
            IncomeFromSal: itr1?.ITR1IncomeDeductions?.IncomeFromSal || 0,
            TotalIncomeChargeableUnHP: itr1?.ITR1IncomeDeductions?.TotalIncomeChargeableUnHP || 0,
            IncomeOthSrc: itr1?.ITR1IncomeDeductions?.IncomeOthSrc || 0,
            GrossTotIncome: itr1?.ITR1IncomeDeductions?.GrossTotIncome || 0,
            GrossTotIncomeIncLTCG112A: itr1?.ITR1IncomeDeductions?.GrossTotIncomeIncLTCG112A || 0,
            DeductUndChapVIA: {
              Section80C: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80C || 0,
              Section80CCC: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80CCC || 0,
              Section80CCDEmployeeOrSE: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80CCDEmployeeOrSE || 0,
              Section80CCD1B: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80CCD1B || 0,
              Section80CCDEmployer: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80CCDEmployer || 0,
              Section80D: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80D || 0,
              Section80E: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80E || 0,
              Section80G: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80G || 0,
              Section80TTA: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.Section80TTA || 0,
              TotalChapVIADeductions: itr1?.ITR1IncomeDeductions?.DeductUndChapVIA?.TotalChapVIADeductions || 0,
            },
            TotalIncome: itr1?.ITR1IncomeDeductions?.TotalIncome || 0,
          },
          ITR1_TaxComputation: {
            TotalTaxPayable: itr1?.ITR1TaxComputation?.TotalTaxPayable || 0,
            Rebate87A: itr1?.ITR1TaxComputation?.Rebate87A || 0,
            TaxPayableOnRebate: itr1?.ITR1TaxComputation?.TaxPayableOnRebate || 0,
            EducationCess: itr1?.ITR1TaxComputation?.EducationCess || 0,
            GrossTaxLiability: itr1?.ITR1TaxComputation?.GrossTaxLiability || 0,
            Section89: itr1?.ITR1TaxComputation?.Section89 || 0,
            NetTaxLiability: itr1?.ITR1TaxComputation?.NetTaxLiability || 0,
            TotalIntrstPay: itr1?.ITR1TaxComputation?.TotalIntrstPay || 0,
            IntrstPay: {
              IntrstPayUs234A: itr1?.ITR1TaxComputation?.IntrstPay?.IntrstPayUs234A || 0,
              IntrstPayUs234B: itr1?.ITR1TaxComputation?.IntrstPay?.IntrstPayUs234B || 0,
              IntrstPayUs234C: itr1?.ITR1TaxComputation?.IntrstPay?.IntrstPayUs234C || 0,
              LateFilingFee234F: itr1?.ITR1TaxComputation?.IntrstPay?.LateFilingFee234F || 0,
            },
            TotTaxPlusIntrstPay: itr1?.ITR1TaxComputation?.TotTaxPlusIntrstPay || 0,
          },
          TaxPaid: {
            TaxesPaid: {
              AdvanceTax: itr1?.TaxPaid?.TaxesPaid?.AdvanceTax || 0,
              TDS: itr1?.TaxPaid?.TaxesPaid?.TDS || 0,
              TCS: itr1?.TaxPaid?.TaxesPaid?.TCS || 0,
              SelfAssessmentTax: itr1?.TaxPaid?.TaxesPaid?.SelfAssessmentTax || 0,
              TotalTaxesPaid: itr1?.TaxPaid?.TaxesPaid?.TotalTaxesPaid || 0,
            },
            BalTaxPayable: itr1?.TaxPaid?.BalTaxPayable || 0,
          },
          Refund: {
            RefundDue: itr1?.Refund?.RefundDue || 0,
            BankAccountDtls: parsedBank,
          },
          Verification: {
            Declaration: {
              AssesseeVerName: itr1?.Verification?.Declaration?.AssesseeVerName || '',
              FatherName: itr1?.Verification?.Declaration?.FatherName || '',
              AssesseeVerPAN: itr1?.Verification?.Declaration?.AssesseeVerPAN || '',
            },
            Capacity: (itr1?.Verification?.Capacity as 'S' | 'R') || 'S',
            Place: itr1?.Verification?.Place || '',
          },
        },
      },
    };
  }
}
