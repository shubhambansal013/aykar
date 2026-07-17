import { Form26ASData } from '../../types';
import { Form26AS } from '../../../generated/sources/form26as';

export class Form26asMapper {
  static toProto(data: Form26ASData): Form26AS {
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
      tdsSalary: (data.tdsSalary || []).map(x => ({
        tan: x.tan,
        deductorName: x.deductorName,
        amount: x.amount,
      })),
      tdsOther: (data.tdsOther || []).map(x => ({
        tan: x.tan,
        deductorName: x.deductorName,
        section: x.section,
        amount: x.amount,
      })),
      tcsDetails: (data.tcsDetails || []).map(x => ({
        collectorName: x.collectorName,
        amount: x.amount,
      })),
      advanceTax: (data.advanceTax || []).map(x => ({
        bsrCode: x.bsrCode,
        date: x.date,
        challanNo: x.challanNo,
        amount: x.amount,
      })),
      selfAssessmentTax: (data.selfAssessmentTax || []).map(x => ({
        bsrCode: x.bsrCode,
        date: x.date,
        challanNo: x.challanNo,
        amount: x.amount,
      })),
    };
  }

  static toDomain(proto: Form26AS): Form26ASData {
    return {
      tdsSalary: (proto.tdsSalary || []).map(x => ({
        tan: x.tan || '',
        deductorName: x.deductorName || '',
        amount: x.amount || 0,
      })),
      tdsOther: (proto.tdsOther || []).map(x => ({
        tan: x.tan || '',
        deductorName: x.deductorName || '',
        section: x.section || '',
        amount: x.amount || 0,
      })),
      tcsDetails: (proto.tcsDetails || []).map(x => ({
        collectorName: x.collectorName || '',
        amount: x.amount || 0,
      })),
      advanceTax: (proto.advanceTax || []).map(x => ({
        bsrCode: x.bsrCode || '',
        date: x.date || '',
        challanNo: x.challanNo || '',
        amount: x.amount || 0,
      })),
      selfAssessmentTax: (proto.selfAssessmentTax || []).map(x => ({
        bsrCode: x.bsrCode || '',
        date: x.date || '',
        challanNo: x.challanNo || '',
        amount: x.amount || 0,
      })),
      metadata: proto.metadata ? {
        financialYear: proto.metadata.financialYear || '',
        assessmentYear: '',
      } : undefined,
      profile: proto.profile ? {
        pan: proto.profile.pan || '',
        name: proto.profile.name || '',
        address: proto.profile.address || '',
      } : undefined,
    };
  }
}
