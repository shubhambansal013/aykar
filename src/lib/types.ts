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
    exemptAllowancesUs10: Array<{ code?: string; nature?: string; amount: number }>;
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
  // Expanded fields
  metadata?: {
    financialYear: string;
    assessmentYear: string;
  };
  profile?: {
    pan: string;
    name: string;
    address: string;
  };
  tdsTcsInfo?: {
    records: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      totalCount: number;
      totalAmount: number;
      transactions: Array<{
        quarter: string;
        dateOfPaymentCredit: string;
        amountPaidCredited: number;
        tdsDeducted: number;
        tdsDeposited: number;
        status: string;
      }>;
    }>;
  };
  sftInfo?: {
    savingsInterest: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      reportedOn: string;
      accountNumber: string;
      accountType: string;
      interestAmount: number;
      status: string;
    }>;
    depositInterest: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      reportedOn: string;
      accountNumber: string;
      accountType: string;
      interestAmount: number;
      status: string;
    }>;
    securitySales: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      dateOfSaleTransfer: string;
      securityName: string;
      securityCodeIsin: string;
      securityClass: string;
      debitType: string;
      creditType: string;
      assetType: string;
      quantity: number;
      salePricePerUnit: number;
      salesConsideration: number;
      costOfAcquisition: number;
      unitFmv: number;
      fairMarketValue: number;
      indexedCostOfAcquisition: number;
      status: string;
    }>;
    securityPurchases: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      quarter: string;
      totalPurchaseAmount: number;
      totalSalesValue: number;
      clientId: string;
      amcName: string;
      holderFlag: string;
      status: string;
    }>;
  };
  taxPayments?: Array<{
    financialYear: string;
    majorHead: string;
    minorHead: string;
    taxAmount: number;
    surcharge: number;
    educationCess: number;
    others: number;
    totalAmountPaid: number;
    bsrCode: string;
    dateOfDeposit: string;
    challanSerialNumber: number;
    challanIdentificationNumber: string;
  }>;
  otherInfo?: {
    salaries: Array<{
      infoCode: string;
      infoDescription: string;
      informationSource: string;
      employmentStartDate: string;
      employmentEndDate: string;
      gross_salary_us_17_1: number;
      value_of_perquisites_us_17_2: number;
      profits_in_lieu_of_salary_us_17_3: number;
      grossSalaryStatus: string;
    }>;
  };
}

export interface TISData {
  salaryDerived: number;
  interestSavings: number;
  interestDeposit: number;
  dividendIncome: number;
  // Expanded fields
  metadata?: {
    financialYear: string;
    assessmentYear: string;
  };
  profile?: {
    pan: string;
    name: string;
    address: string;
  };
  categories?: Array<{
    categoryName: string;
    processedBySystem: number;
    acceptedByTaxpayer: number;
  }>;
  details?: Array<{
    parentCategory: string;
    part: string;
    informationDescription: string;
    informationSource: string;
    amountDescription: string;
    reportedBySource: number;
    processedBySystem?: number;
    acceptedByTaxpayer?: number;
  }>;
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
  // Expanded fields
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
