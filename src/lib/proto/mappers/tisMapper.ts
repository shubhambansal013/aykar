import { TISData } from '../../types';
import { TaxpayerInformationSummary } from '../../../generated/sources/tis';

export class TisMapper {
  static toProto(data: TISData): TaxpayerInformationSummary {
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
      categories: data.categories ? data.categories.map(c => ({
        categoryName: c.categoryName,
        processedBySystem: c.processedBySystem,
        acceptedByTaxpayer: c.acceptedByTaxpayer,
      })) : [
        { categoryName: 'Salary', processedBySystem: data.salaryDerived, acceptedByTaxpayer: data.salaryDerived },
        { categoryName: 'Interest from savings bank', processedBySystem: data.interestSavings, acceptedByTaxpayer: data.interestSavings },
        { categoryName: 'Interest on deposit', processedBySystem: data.interestDeposit, acceptedByTaxpayer: data.interestDeposit },
        { categoryName: 'Dividend', processedBySystem: data.dividendIncome, acceptedByTaxpayer: data.dividendIncome },
      ],
      details: data.details ? data.details.map(d => ({
        parentCategory: d.parentCategory,
        part: d.part,
        informationDescription: d.informationDescription,
        informationSource: d.informationSource,
        amountDescription: d.amountDescription,
        reportedBySource: d.reportedBySource,
        processedBySystem: d.processedBySystem,
        acceptedByTaxpayer: d.acceptedByTaxpayer,
      })) : [],
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
      metadata: proto.metadata ? {
        financialYear: proto.metadata.financialYear || '',
        assessmentYear: '',
      } : undefined,
      profile: proto.profile ? {
        pan: proto.profile.pan || '',
        name: proto.profile.name || '',
        address: proto.profile.address || '',
      } : undefined,
      categories: proto.categories ? proto.categories.map(c => ({
        categoryName: c.categoryName || '',
        processedBySystem: c.processedBySystem || 0,
        acceptedByTaxpayer: c.acceptedByTaxpayer || 0,
      })) : undefined,
      details: proto.details ? proto.details.map(d => ({
        parentCategory: d.parentCategory || '',
        part: d.part || '',
        informationDescription: d.informationDescription || '',
        informationSource: d.informationSource || '',
        amountDescription: d.amountDescription || '',
        reportedBySource: d.reportedBySource || 0,
        processedBySystem: d.processedBySystem || 0,
        acceptedByTaxpayer: d.acceptedByTaxpayer || 0,
      })) : undefined,
    };
  }
}
