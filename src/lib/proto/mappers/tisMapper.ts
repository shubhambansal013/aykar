import { TISData } from '../../types';
import { TaxpayerInformationSummary } from '../../../generated/sources/tis';

export class TisMapper {
  static toProto(data: TISData): TaxpayerInformationSummary {
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
      categories: [
        { categoryName: 'Salary', processedBySystem: data.salaryDerived, acceptedByTaxpayer: data.salaryDerived },
        { categoryName: 'Interest from savings bank', processedBySystem: data.interestSavings, acceptedByTaxpayer: data.interestSavings },
        { categoryName: 'Interest on deposit', processedBySystem: data.interestDeposit, acceptedByTaxpayer: data.interestDeposit },
        { categoryName: 'Dividend', processedBySystem: data.dividendIncome, acceptedByTaxpayer: data.dividendIncome },
      ],
      details: [],
    };
  }

  static toDomain(proto: TaxpayerInformationSummary): TISData {
    let salaryDerived = 0;
    let interestSavings = 0;
    let interestDeposit = 0;
    let dividendIncome = 0;

    for (const cat of (proto.categories || [])) {
      if (/Salary/i.test(cat.categoryName)) {
        salaryDerived = cat.acceptedByTaxpayer || cat.processedBySystem || 0;
      } else if (/savings/i.test(cat.categoryName)) {
        interestSavings = cat.acceptedByTaxpayer || cat.processedBySystem || 0;
      } else if (/deposit/i.test(cat.categoryName)) {
        interestDeposit = cat.acceptedByTaxpayer || cat.processedBySystem || 0;
      } else if (/Dividend/i.test(cat.categoryName)) {
        dividendIncome = cat.acceptedByTaxpayer || cat.processedBySystem || 0;
      }
    }

    return {
      salaryDerived,
      interestSavings,
      interestDeposit,
      dividendIncome,
    };
  }
}
