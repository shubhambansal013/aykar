import { ReconciledTaxData } from '../../types';
import { EngineReconciliationResult } from '../../../generated/platform/engine';
import { Form16Mapper } from './form16Mapper';
import { AisMapper } from './aisMapper';
import { TisMapper } from './tisMapper';
import { Form26asMapper } from './form26asMapper';

export class EngineMapper {
  static toProto(data: ReconciledTaxData): EngineReconciliationResult {
    const form16_data = Form16Mapper.toProto(data);
    const ais_data = data.aisData ? AisMapper.toProto(data.aisData) : undefined;
    const tis_data = data.tisData ? TisMapper.toProto(data.tisData) : undefined;
    const form26as_data = data.form26asData ? Form26asMapper.toProto(data.form26asData) : undefined;

    return {
      form16Data: form16_data,
      aisData: ais_data,
      tisData: tis_data,
      form26asData: form26as_data,
      taxCredits: {
        tdsSalary: data.taxCredits?.tdsSalary || 0,
        tdsOther: data.taxCredits?.tdsOther || 0,
        tcs: data.taxCredits?.tcs || 0,
        advanceTax: data.taxCredits?.advanceTax || 0,
        selfAssessmentTax: data.taxCredits?.selfAssessmentTax || 0,
      },
      discrepancies: data.discrepancies || [],
      detectedIncomeSources: (data.detectedIncomeSources || []).map(x => ({
        source: x.source,
        category: x.category,
        amount: x.amount,
        confirmed: x.confirmed,
      })),
      calculatedTaxOldRegime: 0,
      calculatedTaxNewRegime: 0,
    };
  }

  static toDomain(proto: EngineReconciliationResult): ReconciledTaxData {
    const form16Data = proto.form16Data ? Form16Mapper.toDomain(proto.form16Data) : Form16Mapper.toDomain({ taxpayerProfile: undefined, certificates: [], metadata: undefined } as any);
    const aisData = proto.aisData ? AisMapper.toDomain(proto.aisData) : undefined;
    const tisData = proto.tisData ? TisMapper.toDomain(proto.tisData) : undefined;
    const form26asData = proto.form26asData ? Form26asMapper.toDomain(proto.form26asData) : undefined;

    return {
      ...form16Data,
      aisData,
      tisData,
      form26asData,
      taxCredits: {
        tdsSalary: proto.taxCredits?.tdsSalary || 0,
        tdsOther: proto.taxCredits?.tdsOther || 0,
        tcs: proto.taxCredits?.tcs || 0,
        advanceTax: proto.taxCredits?.advanceTax || 0,
        selfAssessmentTax: proto.taxCredits?.selfAssessmentTax || 0,
      },
      discrepancies: proto.discrepancies || [],
      detectedIncomeSources: (proto.detectedIncomeSources || []).map(x => ({
        source: x.source,
        category: x.category as 'interestSavings' | 'interestDeposit' | 'dividendIncome' | 'salary' | 'other',
        amount: x.amount,
        confirmed: x.confirmed,
      })),
    };
  }
}
