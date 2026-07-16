import { describe, it, expect } from 'vitest';
import { Form16Data, AISData, TISData, Form26ASData, ITR1_JSON, ReconciledTaxData } from '../../types';
import {
  Form16Mapper,
  AisMapper,
  TisMapper,
  Form26asMapper,
  ItrMapper,
  EngineMapper,
} from './index';

import { Form16Bundle } from '../../../generated/sources/form16';
import { AnnualInformationStatement } from '../../../generated/sources/ais';
import { TaxpayerInformationSummary } from '../../../generated/sources/tis';
import { Form26AS } from '../../../generated/sources/form26as';
import { ItrJson } from '../../../generated/platform/itr';
import { EngineReconciliationResult } from '../../../generated/platform/engine';

describe('Modular Protobuf Specific Mappers Suite', () => {
  it('should successfully map, serialize, and deserialize Form 16 data via Form16Mapper', () => {
    const originalForm16: Form16Data = {
      employer: {
        name: 'Parametric Technology Pvt Ltd',
        tan: 'MUMP12345A',
        pan: 'AAACP1234F',
        address: 'Pune, India',
      },
      employee: {
        name: {
          firstName: 'Siddharth',
          middleName: 'H',
          lastName: 'Choudhary',
        },
        pan: 'ABCDE1234F',
        address: 'Bangalore, India',
      },
      assessmentYear: '2026-27',
      period: {
        from: '01-Apr-2025',
        to: '31-Mar-2026',
      },
      salary: {
        grossSalary: 1500000,
        salaryAsPer17_1: 1450000,
        perquisites17_2: 30000,
        profitsInLieu17_3: 20000,
        exemptAllowancesUs10: [
          { code: '10(13A)', nature: 'House Rent Allowance', amount: 120000 },
          { code: '10(5)', nature: 'Leave Travel Allowance', amount: 30000 },
        ],
        totalExemptAllowances: 150000,
        netSalary: 1350000,
        standardDeduction16ia: 75000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 2500,
        totalDeductionsUs16: 77500,
        incomeChargeableUnderHeadSalaries: 1272500,
      },
      otherIncome: {
        houseProperty: -50000,
        otherSources: [],
        totalOtherSources: 10000,
      },
      grossTotalIncome: 1232500,
      deductions80C: 150000,
      deductions80CCC: 0,
      deductions80CCD1: 50000,
      deductions80CCD1B: 50000,
      deductions80CCD2: 0,
      deductions80D: 25000,
      deductions80E: 0,
      deductions80G: 0,
      deductions80TTA: 10000,
      totalChapterVIADeductions: 285000,
      totalIncome: 947500,
      taxPayable: 45000,
    };

    // 1. Map to Protobuf
    const protoBundle = Form16Mapper.toProto(originalForm16);
    expect(protoBundle.certificates).toHaveLength(1);
    expect(protoBundle.taxpayerProfile?.name).toBe('Siddharth H Choudhary');
    expect(protoBundle.certificates[0].employerProfile?.name).toBe('Parametric Technology Pvt Ltd');

    // 2. Serialize to Uint8Array using ts-proto generated encode
    const bytes = Form16Bundle.encode(protoBundle).finish();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    // 3. Deserialize back
    const decodedBundle = Form16Bundle.decode(bytes);
    expect(decodedBundle.taxpayerProfile?.name).toBe('Siddharth H Choudhary');

    // 4. Map back to domain type
    const mappedBack = Form16Mapper.toDomain(decodedBundle);
    expect(mappedBack.employer.name).toBe(originalForm16.employer.name);
    expect(mappedBack.employee.name.firstName).toBe('Siddharth');
    expect(mappedBack.employee.name.middleName).toBe('H');
    expect(mappedBack.employee.name.lastName).toBe('Choudhary');
    expect(mappedBack.salary.grossSalary).toBe(originalForm16.salary.grossSalary);
    expect(mappedBack.salary.exemptAllowancesUs10).toHaveLength(2);
    expect(mappedBack.salary.exemptAllowancesUs10[0].code).toBe('10(13A)');
    expect(mappedBack.salary.exemptAllowancesUs10[0].amount).toBe(120000);
    expect(mappedBack.deductions80C).toBe(originalForm16.deductions80C);
    expect(mappedBack.totalIncome).toBe(originalForm16.totalIncome);
  });

  it('should successfully map, serialize, and deserialize AIS data via AisMapper', () => {
    const originalAis: AISData = {
      interestSavings: 12000,
      interestDeposit: 45000,
      dividendIncome: 5000,
      tdsDetails: [
        { tan: 'MUMP12345A', deductorName: 'Bank of India', section: '194A', amount: 4500 },
      ],
    };

    const protoAis = AisMapper.toProto(originalAis);
    expect(protoAis.sftInfo?.savingsInterest?.[0].interestAmount).toBe(12000);
    expect(protoAis.sftInfo?.depositInterest?.[0].interestAmount).toBe(45000);
    expect(protoAis.tdsTcsInfo?.records?.[0].totalAmount).toBe(4500);

    const bytes = AnnualInformationStatement.encode(protoAis).finish();
    const decoded = AnnualInformationStatement.decode(bytes);
    const mappedBack = AisMapper.toDomain(decoded);

    expect(mappedBack.interestSavings).toBe(originalAis.interestSavings);
    expect(mappedBack.interestDeposit).toBe(originalAis.interestDeposit);
    expect(mappedBack.tdsDetails?.[0].deductorName).toBe('Bank of India');
    expect(mappedBack.tdsDetails?.[0].section).toBe('194A');
    expect(mappedBack.tdsDetails?.[0].amount).toBe(4500);
  });

  it('should successfully map, serialize, and deserialize TIS data via TisMapper', () => {
    const originalTis: TISData = {
      salaryDerived: 1200000,
      interestSavings: 15000,
      interestDeposit: 30000,
      dividendIncome: 2500,
    };

    const protoTis = TisMapper.toProto(originalTis);
    expect(protoTis.categories).toHaveLength(4);

    const bytes = TaxpayerInformationSummary.encode(protoTis).finish();
    const decoded = TaxpayerInformationSummary.decode(bytes);
    const mappedBack = TisMapper.toDomain(decoded);

    expect(mappedBack.salaryDerived).toBe(originalTis.salaryDerived);
    expect(mappedBack.interestSavings).toBe(originalTis.interestSavings);
    expect(mappedBack.interestDeposit).toBe(originalTis.interestDeposit);
    expect(mappedBack.dividendIncome).toBe(originalTis.dividendIncome);
  });

  it('should successfully map, serialize, and deserialize Form 26AS data via Form26asMapper', () => {
    const original26as: Form26ASData = {
      tdsSalary: [
        { tan: 'TANA12345B', deductorName: 'Employer A', amount: 50000 },
      ],
      tdsOther: [
        { tan: 'TANB12345C', deductorName: 'Bank B', section: '194A', amount: 2000 },
      ],
      tcsDetails: [
        { collectorName: 'Car Dealer C', amount: 15000 },
      ],
      advanceTax: [
        { bsrCode: '0001234', date: '15-Sep-2025', challanNo: '111', amount: 25000 },
      ],
      selfAssessmentTax: [
        { bsrCode: '0001234', date: '25-Jul-2026', challanNo: '222', amount: 12000 },
      ],
    };

    const proto26as = Form26asMapper.toProto(original26as);
    expect(proto26as.tdsSalary).toHaveLength(1);
    expect(proto26as.tdsOther).toHaveLength(1);
    expect(proto26as.tcsDetails).toHaveLength(1);
    expect(proto26as.advanceTax).toHaveLength(1);
    expect(proto26as.selfAssessmentTax).toHaveLength(1);

    const bytes = Form26AS.encode(proto26as).finish();
    const decoded = Form26AS.decode(bytes);
    const mappedBack = Form26asMapper.toDomain(decoded);

    expect(mappedBack.tdsSalary?.[0].deductorName).toBe('Employer A');
    expect(mappedBack.tdsSalary?.[0].amount).toBe(50000);
    expect(mappedBack.tdsOther?.[0].section).toBe('194A');
    expect(mappedBack.tdsOther?.[0].amount).toBe(2000);
    expect(mappedBack.tcsDetails?.[0].collectorName).toBe('Car Dealer C');
    expect(mappedBack.tcsDetails?.[0].amount).toBe(15000);
    expect(mappedBack.advanceTax?.[0].challanNo).toBe('111');
    expect(mappedBack.advanceTax?.[0].amount).toBe(25000);
    expect(mappedBack.selfAssessmentTax?.[0].challanNo).toBe('222');
    expect(mappedBack.selfAssessmentTax?.[0].amount).toBe(12000);
  });

  it('should successfully map, serialize, and deserialize ITR-1 JSON data via ItrMapper', () => {
    const originalItr: ITR1_JSON = {
      ITR: {
        ITR1: {
          CreationInfo: {
            SWVersionNo: '1.0',
            SWCreatedBy: 'Aykar',
            JSONCreatedBy: 'Taxpayer',
            JSONCreationDate: '2026-07-01',
            IntermediaryCity: 'Pune',
            Digest: 'abcde',
          },
          Form_ITR1: {
            FormName: 'ITR-1',
            Description: 'Sahaj',
            AssessmentYear: '2026-27',
            SchemaVer: '1.0',
            FormVer: '1.0',
          },
          PersonalInfo: {
            AssesseeName: {
              FirstName: 'Siddharth',
              MiddleName: 'H',
              SurNameOrOrgName: 'Choudhary',
            },
            PAN: 'ABCDE1234F',
            Address: { PinCode: '411045', StateCode: 'MH' },
            SecondaryAdd: 'N',
            DOB: '1990-01-01',
            EmployerCategory: 'OTH',
          },
          FilingStatus: {
            ReturnFileSec: 11,
            OptOutNewTaxRegime: 'N',
            AsseseeRepFlg: 'N',
            ItrFilingDueDate: '2026-07-31',
          },
          ITR1_IncomeDeductions: {
            GrossSalary: 1500000,
            Salary: 1450000,
            PerquisitesValue: 30000,
            ProfitsInSalary: 20000,
            AllwncExemptUs10: {
              AllwncExemptUs10Dtls: [
                { SalNatureDesc: 'House Rent Allowance', SalOthAmount: 120000 },
              ],
              TotalAllwncExemptUs10: 120000,
            },
            NetSalary: 1380000,
            DeductionUs16ia: 75000,
            EntertainmentAlw16ii: 0,
            ProfessionalTaxUs16iii: 2500,
            DeductionUs16: 77500,
            IncomeFromSal: 1302500,
            TotalIncomeChargeableUnHP: 0,
            IncomeOthSrc: 15000,
            GrossTotIncome: 1317500,
            GrossTotIncomeIncLTCG112A: 1317500,
            DeductUndChapVIA: {
              Section80C: 150000,
              Section80CCC: 0,
              Section80CCDEmployeeOrSE: 50000,
              Section80CCD1B: 0,
              Section80CCDEmployer: 0,
              Section80D: 25000,
              Section80E: 0,
              Section80G: 0,
              Section80TTA: 10000,
              TotalChapVIADeductions: 235000,
            },
            TotalIncome: 1082500,
          },
          ITR1_TaxComputation: {
            TotalTaxPayable: 65000,
            Rebate87A: 0,
            TaxPayableOnRebate: 0,
            EducationCess: 2600,
            GrossTaxLiability: 67600,
            Section89: 0,
            NetTaxLiability: 67600,
            TotalIntrstPay: 0,
            IntrstPay: {
              IntrstPayUs234A: 0,
              IntrstPayUs234B: 0,
              IntrstPayUs234C: 0,
              LateFilingFee234F: 0,
            },
            TotTaxPlusIntrstPay: 67600,
          },
          TaxPaid: {
            TaxesPaid: {
              AdvanceTax: 0,
              TDS: 67600,
              TCS: 0,
              SelfAssessmentTax: 0,
              TotalTaxesPaid: 67600,
            },
            BalTaxPayable: 0,
          },
          Refund: {
            RefundDue: 0,
            BankAccountDtls: { AccNo: '123456', Ifsc: 'SBIN0001234' },
          },
          Verification: {
            Declaration: {
              AssesseeVerName: 'Siddharth Choudhary',
              FatherName: 'H Choudhary',
              AssesseeVerPAN: 'ABCDE1234F',
            },
            Capacity: 'S',
            Place: 'Pune',
          },
        },
      },
    };

    const protoItr = ItrMapper.toProto(originalItr);
    expect(protoItr.ITR?.ITR1?.PersonalInfo?.PAN).toBe('ABCDE1234F');

    const bytes = ItrJson.encode(protoItr).finish();
    const decoded = ItrJson.decode(bytes);
    const mappedBack = ItrMapper.toDomain(decoded);

    expect(mappedBack.ITR.ITR1.PersonalInfo.PAN).toBe('ABCDE1234F');
    expect(mappedBack.ITR.ITR1.PersonalInfo.Address.PinCode).toBe('411045');
    expect(mappedBack.ITR.ITR1.PersonalInfo.Address.StateCode).toBe('MH');
    expect(mappedBack.ITR.ITR1.ITR1_IncomeDeductions.GrossSalary).toBe(1500000);
    expect(mappedBack.ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C).toBe(150000);
    expect(mappedBack.ITR.ITR1.Refund.BankAccountDtls.AccNo).toBe('123456');
  });

  it('should successfully map, serialize, and deserialize Reconciled Tax Data via EngineMapper', () => {
    const originalReconciled: ReconciledTaxData = {
      employer: { name: 'Employer', tan: 'TAN123', pan: 'PAN123', address: 'Addr' },
      employee: { name: { firstName: 'First', middleName: '', lastName: 'Last' }, pan: 'PANEMP', address: 'AddrEmp' },
      assessmentYear: '2026-27',
      period: { from: '2025-04-01', to: '2026-03-31' },
      salary: {
        grossSalary: 1000000,
        salaryAsPer17_1: 1000000,
        perquisites17_2: 0,
        profitsInLieu17_3: 0,
        exemptAllowancesUs10: [],
        totalExemptAllowances: 0,
        netSalary: 1000000,
        standardDeduction16ia: 75000,
        entertainmentAllowance16ii: 0,
        professionalTax16iii: 0,
        totalDeductionsUs16: 75000,
        incomeChargeableUnderHeadSalaries: 925000,
      },
      otherIncome: { houseProperty: 0, otherSources: [], totalOtherSources: 0 },
      grossTotalIncome: 925000,
      deductions80C: 150000,
      deductions80CCC: 0,
      deductions80CCD1: 0,
      deductions80CCD1B: 0,
      deductions80CCD2: 0,
      deductions80D: 0,
      deductions80E: 0,
      deductions80G: 0,
      deductions80TTA: 0,
      totalChapterVIADeductions: 150000,
      totalIncome: 775000,
      taxPayable: 35000,
      aisData: {
        interestSavings: 5000,
        interestDeposit: 0,
        dividendIncome: 0,
        tdsDetails: [],
      },
      discrepancies: ['Mismatch in interest savings'],
      detectedIncomeSources: [
        { source: 'Bank savings', category: 'interestSavings', amount: 5000, confirmed: false },
      ],
      taxCredits: {
        tdsSalary: 35000,
        tdsOther: 0,
        tcs: 0,
        advanceTax: 0,
        selfAssessmentTax: 0,
      },
    };

    const protoEngine = EngineMapper.toProto(originalReconciled);
    expect(protoEngine.discrepancies).toContain('Mismatch in interest savings');

    const bytes = EngineReconciliationResult.encode(protoEngine).finish();
    const decoded = EngineReconciliationResult.decode(bytes);
    const mappedBack = EngineMapper.toDomain(decoded);

    expect(mappedBack.employee.name.firstName).toBe('First');
    expect(mappedBack.employee.name.lastName).toBe('Last');
    expect(mappedBack.salary.grossSalary).toBe(1000000);
    expect(mappedBack.aisData?.interestSavings).toBe(5000);
    expect(mappedBack.discrepancies).toContain('Mismatch in interest savings');
    expect(mappedBack.detectedIncomeSources?.[0].source).toBe('Bank savings');
    expect(mappedBack.detectedIncomeSources?.[0].category).toBe('interestSavings');
    expect(mappedBack.taxCredits?.tdsSalary).toBe(35000);
  });
});
