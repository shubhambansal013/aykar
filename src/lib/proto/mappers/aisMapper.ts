import { AISData } from '../../types';
import { AnnualInformationStatement } from '../../../generated/sources/ais';

export class AisMapper {
  static toProto(data: AISData): AnnualInformationStatement {
    return {
      metadata: {
        financialYear: data.metadata?.financialYear || '',
        downloadId: undefined,
        generationDate: new Date(),
        ipAddress: undefined,
      },
      profile: {
        pan: data.profile?.pan || '',
        aadhaarMasked: undefined,
        name: data.profile?.name || '',
        dateOfBirth: '',
        mobileNumber: undefined,
        emailAddress: undefined,
        address: data.profile?.address || undefined,
      },
      tdsTcsInfo: data.tdsTcsInfo ? {
        records: data.tdsTcsInfo.records.map(r => ({
          infoCode: r.infoCode,
          infoDescription: r.infoDescription,
          informationSource: r.informationSource,
          totalCount: r.totalCount,
          totalAmount: r.totalAmount,
          transactions: r.transactions.map(t => ({
            quarter: t.quarter,
            dateOfPaymentCredit: t.dateOfPaymentCredit,
            amountPaidCredited: t.amountPaidCredited,
            tdsDeducted: t.tdsDeducted,
            tdsDeposited: t.tdsDeposited,
            status: t.status,
          })),
        })),
      } : {
        records: (data.tdsDetails || []).map(x => ({
          infoCode: x.section,
          infoDescription: '',
          informationSource: x.deductorName,
          totalCount: 1,
          totalAmount: x.amount,
          transactions: [],
        })),
      },
      sftInfo: data.sftInfo ? {
        savingsInterest: data.sftInfo.savingsInterest,
        depositInterest: data.sftInfo.depositInterest,
        securitySales: data.sftInfo.securitySales,
        securityPurchases: data.sftInfo.securityPurchases,
      } : {
        savingsInterest: data.interestSavings ? [{
          infoCode: 'SFT-016(SB)',
          infoDescription: '',
          informationSource: '',
          reportedOn: '',
          accountNumber: '',
          accountType: 'Saving',
          interestAmount: data.interestSavings,
          status: 'Active',
        }] : [],
        depositInterest: data.interestDeposit ? [{
          infoCode: 'SFT-016(TD)',
          infoDescription: '',
          informationSource: '',
          reportedOn: '',
          accountNumber: '',
          accountType: 'Time Deposit',
          interestAmount: data.interestDeposit,
          status: 'Active',
        }] : [],
        securitySales: [],
        securityPurchases: [],
      },
      otherInfo: data.otherInfo ? {
        salaries: data.otherInfo.salaries,
      } : {
        salaries: [],
      },
      taxPayments: data.taxPayments || [],
      demandsAndRefunds: undefined,
    };
  }

  static toDomain(proto: AnnualInformationStatement): AISData {
    const interestSavings = proto.sftInfo?.savingsInterest?.reduce((sum, item) => sum + (item.interestAmount || 0), 0) || 0;
    const interestDeposit = proto.sftInfo?.depositInterest?.reduce((sum, item) => sum + (item.interestAmount || 0), 0) || 0;

    const tdsDetails = (proto.tdsTcsInfo?.records || []).map(r => ({
      tan: '',
      deductorName: r.informationSource,
      section: r.infoCode,
      amount: r.totalAmount,
    }));

    return {
      interestSavings,
      interestDeposit,
      dividendIncome: 0,
      tdsDetails,
      metadata: proto.metadata ? {
        financialYear: proto.metadata.financialYear || '',
        assessmentYear: '',
      } : undefined,
      profile: proto.profile ? {
        pan: proto.profile.pan || '',
        name: proto.profile.name || '',
        address: proto.profile.address || '',
      } : undefined,
      tdsTcsInfo: proto.tdsTcsInfo ? {
        records: proto.tdsTcsInfo.records.map(r => ({
          infoCode: r.infoCode || '',
          infoDescription: r.infoDescription || '',
          informationSource: r.informationSource || '',
          totalCount: r.totalCount || 0,
          totalAmount: r.totalAmount || 0,
          transactions: (r.transactions || []).map(t => ({
            quarter: t.quarter || '',
            dateOfPaymentCredit: t.dateOfPaymentCredit || '',
            amountPaidCredited: t.amountPaidCredited || 0,
            tdsDeducted: t.tdsDeducted || 0,
            tdsDeposited: t.tdsDeposited || 0,
            status: t.status || '',
          })),
        })),
      } : undefined,
      sftInfo: proto.sftInfo ? {
        savingsInterest: (proto.sftInfo.savingsInterest || []).map(s => ({
          infoCode: s.infoCode || '',
          infoDescription: s.infoDescription || '',
          informationSource: s.informationSource || '',
          reportedOn: s.reportedOn || '',
          accountNumber: s.accountNumber || '',
          accountType: s.accountType || '',
          interestAmount: s.interestAmount || 0,
          status: s.status || '',
        })),
        depositInterest: (proto.sftInfo.depositInterest || []).map(d => ({
          infoCode: d.infoCode || '',
          infoDescription: d.infoDescription || '',
          informationSource: d.informationSource || '',
          reportedOn: d.reportedOn || '',
          accountNumber: d.accountNumber || '',
          accountType: d.accountType || '',
          interestAmount: d.interestAmount || 0,
          status: d.status || '',
        })),
        securitySales: (proto.sftInfo.securitySales || []).map(s => ({
          infoCode: s.infoCode || '',
          infoDescription: s.infoDescription || '',
          informationSource: s.informationSource || '',
          dateOfSaleTransfer: s.dateOfSaleTransfer || '',
          securityName: s.securityName || '',
          securityCodeIsin: s.securityCodeIsin || '',
          securityClass: s.securityClass || '',
          debitType: s.debitType || '',
          creditType: s.creditType || '',
          assetType: s.assetType || '',
          quantity: s.quantity || 0,
          salePricePerUnit: s.salePricePerUnit || 0,
          salesConsideration: s.salesConsideration || 0,
          costOfAcquisition: s.costOfAcquisition || 0,
          unitFmv: s.unitFmv || 0,
          fairMarketValue: s.fairMarketValue || 0,
          indexedCostOfAcquisition: s.indexedCostOfAcquisition || 0,
          status: s.status || '',
        })),
        securityPurchases: (proto.sftInfo.securityPurchases || []).map(p => ({
          infoCode: p.infoCode || '',
          infoDescription: p.infoDescription || '',
          informationSource: p.informationSource || '',
          quarter: p.quarter || '',
          totalPurchaseAmount: p.totalPurchaseAmount || 0,
          totalSalesValue: p.totalSalesValue || 0,
          clientId: p.clientId || '',
          amcName: p.amcName || '',
          holderFlag: p.holderFlag || '',
          status: p.status || '',
        })),
      } : undefined,
      taxPayments: proto.taxPayments ? proto.taxPayments.map(p => ({
        financialYear: p.financialYear || '',
        majorHead: p.majorHead || '',
        minorHead: p.minorHead || '',
        taxAmount: p.taxAmount || 0,
        surcharge: p.surcharge || 0,
        educationCess: p.educationCess || 0,
        others: p.others || 0,
        totalAmountPaid: p.totalAmountPaid || 0,
        bsrCode: p.bsrCode || '',
        dateOfDeposit: p.dateOfDeposit || '',
        challanSerialNumber: p.challanSerialNumber || 0,
        challanIdentificationNumber: p.challanIdentificationNumber || '',
      })) : undefined,
      otherInfo: proto.otherInfo ? {
        salaries: (proto.otherInfo.salaries || []).map(s => ({
          infoCode: s.infoCode || '',
          infoDescription: s.infoDescription || '',
          informationSource: s.informationSource || '',
          employmentStartDate: s.employmentStartDate || '',
          employmentEndDate: s.employmentEndDate || '',
          gross_salary_us_17_1: s.grossSalaryUs171 || 0,
          value_of_perquisites_us_17_2: s.valueOfPerquisitesUs172 || 0,
          profits_in_lieu_of_salary_us_17_3: s.profitsInLieuOfSalaryUs173 || 0,
          grossSalaryStatus: s.grossSalaryStatus || '',
        })),
      } : undefined,
    };
  }
}
