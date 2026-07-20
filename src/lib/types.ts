// ITR-1 JSON Structure (Partial, based on schema)
export interface ITR1_JSON {
  ITR: {
    ITR1: {
      CreationInfo: {
        SWVersionNo: string;
        SWCreatedBy: string;
        JSONCreatedBy: string;
        JSONCreationDate: string;
        IntermediaryCity: string;
        Digest: string;
      };
      Form_ITR1: {
        FormName: string;
        Description: string;
        AssessmentYear: string;
        SchemaVer: string;
        FormVer: string;
      };
      PersonalInfo: {
        AssesseeName: {
          FirstName?: string;
          MiddleName?: string;
          SurNameOrOrgName: string;
        };
        PAN: string;
        Address: any;
        SecondaryAdd: 'Y' | 'N';
        DOB: string;
        EmployerCategory: string;
      };
      FilingStatus: {
        ReturnFileSec: number;
        OptOutNewTaxRegime: 'Y' | 'N';
        AsseseeRepFlg: 'Y' | 'N';
        ItrFilingDueDate: string;
      };
      ITR1_IncomeDeductions: {
        GrossSalary: number;
        Salary: number;
        PerquisitesValue: number;
        ProfitsInSalary: number;
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
        TotalIncomeChargeableUnHP: number;
        IncomeOthSrc: number;
        GrossTotIncome: number;
        GrossTotIncomeIncLTCG112A: number;
        DeductUndChapVIA: {
          Section80C: number;
          Section80CCC: number;
          Section80CCDEmployeeOrSE: number;
          Section80CCD1B: number;
          Section80CCDEmployer: number;
          Section80D: number;
          Section80E: number;
          Section80G: number;
          Section80TTA: number;
          TotalChapVIADeductions: number;
        };
        TotalIncome: number;
      };
      ITR1_TaxComputation: {
        TotalTaxPayable: number;
        Rebate87A: number;
        TaxPayableOnRebate: number;
        EducationCess: number;
        GrossTaxLiability: number;
        Section89: number;
        NetTaxLiability: number;
        TotalIntrstPay: number;
        IntrstPay: {
          IntrstPayUs234A: number;
          IntrstPayUs234B: number;
          IntrstPayUs234C: number;
          LateFilingFee234F: number;
        };
        TotTaxPlusIntrstPay: number;
      };
      TaxPaid: {
        TaxesPaid: {
          AdvanceTax: number;
          TDS: number;
          TCS: number;
          SelfAssessmentTax: number;
          TotalTaxesPaid: number;
        };
        BalTaxPayable: number;
      };
      Refund: {
        RefundDue: number;
        BankAccountDtls: any;
      };
      Verification: {
        Declaration: {
          AssesseeVerName: string;
          FatherName: string;
          AssesseeVerPAN: string;
        };
        Capacity: 'S' | 'R';
        Place: string;
      };
    };
  };
}

// ITR-2 JSON Structure (Supporting multi-employer, capital gains, and other sources)
export interface ITR2_JSON {
  ITR: {
    ITR2: {
      CreationInfo: {
        SWVersionNo: string;
        SWCreatedBy: string;
        JSONCreatedBy: string;
        JSONCreationDate: string;
        IntermediaryCity: string;
        Digest: string;
      };
      Form_ITR2: {
        FormName: string;
        Description: string;
        AssessmentYear: string;
        SchemaVer: string;
        FormVer: string;
      };
      PersonalInfo: {
        AssesseeName: {
          FirstName?: string;
          MiddleName?: string;
          SurNameOrOrgName: string;
        };
        PAN: string;
        Address: any;
        SecondaryAdd: 'Y' | 'N';
        DOB: string;
        EmployerCategory: string;
      };
      FilingStatus: {
        ReturnFileSec: number;
        OptOutNewTaxRegime: 'Y' | 'N';
        AsseseeRepFlg: 'Y' | 'N';
        ItrFilingDueDate: string;
      };
      ScheduleS: {
        Details: Array<{
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
        }>;
        TotalSalaries: number;
      };
      ScheduleCG: {
        ShortTermCapitalGains: number;
        LongTermCapitalGains112A: number;
      };
      ScheduleOS: {
        InterestSavings: number;
        InterestDeposit: number;
        DividendIncome: number;
        TotalIncomeOthSrc: number;
        OtherSourceDetails: Array<{ Nature: string; Amount: number }>;
      };
      DeductUndChapVIA: {
        Section80C: number;
        Section80CCC: number;
        Section80CCDEmployeeOrSE: number;
        Section80CCD1B: number;
        Section80CCDEmployer: number;
        Section80D: number;
        Section80E: number;
        Section80G: number;
        Section80TTA: number;
        TotalChapVIADeductions: number;
      };
      ITR2_TaxComputation: {
        TotalTaxPayable: number;
        Rebate87A: number;
        TaxPayableOnRebate: number;
        EducationCess: number;
        GrossTaxLiability: number;
        Section89: number;
        NetTaxLiability: number;
        TotalIntrstPay: number;
        IntrstPay: {
          IntrstPayUs234A: number;
          IntrstPayUs234B: number;
          IntrstPayUs234C: number;
          LateFilingFee234F: number;
        };
        TotTaxPlusIntrstPay: number;
      };
      TaxPaid: {
        TaxesPaid: {
          AdvanceTax: number;
          TDS: number;
          TCS: number;
          SelfAssessmentTax: number;
          TotalTaxesPaid: number;
        };
        BalTaxPayable: number;
      };
      Refund: {
        RefundDue: number;
        BankAccountDtls: any;
      };
      Verification: {
        Declaration: {
          AssesseeVerName: string;
          FatherName: string;
          AssesseeVerPAN: string;
        };
        Capacity: 'S' | 'R';
        Place: string;
      };
    };
  };
}

export type ITR_ANY_JSON = ITR1_JSON | ITR2_JSON;
