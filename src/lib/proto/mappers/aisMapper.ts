import { AISData } from '../../types';
import { AnnualInformationStatement } from '../../../generated/sources/ais';

export class AisMapper {
  static toProto(data: AISData): AnnualInformationStatement {
    return {
      metadata: {
        financialYear: '',
        downloadId: undefined,
        generationDate: new Date(),
        ipAddress: undefined,
      },
      profile: {
        pan: '',
        aadhaarMasked: undefined,
        name: '',
        dateOfBirth: '',
        mobileNumber: undefined,
        emailAddress: undefined,
        address: undefined,
      },
      tdsTcsInfo: {
        records: (data.tdsDetails || []).map(x => ({
          infoCode: x.section,
          infoDescription: '',
          informationSource: x.deductorName,
          totalCount: 1,
          totalAmount: x.amount,
          transactions: [],
        })),
      },
      sftInfo: {
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
      otherInfo: {
        salaries: [],
      },
      taxPayments: [],
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
    };
  }
}
