import { Form16Bundle } from '../../generated/sources/form16';
import { createEmptyForm16Bundle, createForm16Proxy } from '../proto/compatibilityProxy';

/**
 * Form16Merger is a specialized utility class responsible for merging multiple Form16Bundle structures
 * into a single unified Form16Bundle object.
 * This is particularly useful for handling multi-employer cases (job changes) or combining
 * Part A and Part B documents from the same employer.
 */
export class Form16Merger {
  /**
   * Main entry point to merge an array of Form 16 data structures.
   *
   * @param docs Array of parsed Form 16 data objects.
   * @returns A single merged and recalculated Form 16 data object.
   */
  public static merge(docs: Form16Bundle[]): Form16Bundle {
    if (docs.length === 0) {
      return createEmptyForm16Bundle();
    }

    if (docs.length === 1) {
      return JSON.parse(JSON.stringify(docs[0]));
    }

    const mergedBundle = createEmptyForm16Bundle();
    const mergedProxy = createForm16Proxy(mergedBundle);

    if (docs[0].taxpayerProfile) {
      mergedBundle.taxpayerProfile = JSON.parse(JSON.stringify(docs[0].taxpayerProfile));
    }

    const docProxies = docs.map(d => createForm16Proxy(d));

    this.mergeSingleDocument(mergedProxy, docProxies[0]);

    for (let i = 1; i < docs.length; i++) {
      this.mergeSingleDocument(mergedProxy, docProxies[i]);
    }

    this.recalculateDerivedFields(mergedProxy);

    return mergedBundle;
  }

  /**
   * Merges a single Form 16 document's properties into the accumulator object.
   */
  private static mergeSingleDocument(merged: any, doc: any): void {
    this.mergeEmployer(merged, doc);
    this.mergeEmployee(merged, doc);
    this.mergeAssessmentYear(merged, doc);
    this.mergePeriod(merged, doc);
    this.mergeSalary(merged, doc);
    this.mergeOtherIncome(merged, doc);
    this.mergeDeductions(merged, doc);
    this.mergeTaxPayable(merged, doc);
  }

  /**
   * Combines employer name, TAN, PAN, and address with duplicate prevention.
   */
  private static mergeEmployer(merged: any, doc: any): void {
    merged.employer.name = this.joinDistinctTokens(merged.employer.name, doc.employer.name, ' / ');
    merged.employer.tan = this.joinDistinctTokens(merged.employer.tan, doc.employer.tan, ' / ');
    merged.employer.pan = this.joinDistinctTokens(merged.employer.pan, doc.employer.pan, ' / ');

    if (doc.employer.address) {
      if (!merged.employer.address) {
        merged.employer.address = doc.employer.address;
      } else if (merged.employer.address !== doc.employer.address && !merged.employer.address.includes(doc.employer.address)) {
        merged.employer.address += `; ${doc.employer.address}`;
      }
    }
  }

  /**
   * Merges employee's PAN, Name (FirstName, MiddleName, LastName), and Address.
   */
  private static mergeEmployee(merged: any, doc: any): void {
    if (!merged.employee.pan && doc.employee.pan) {
      merged.employee.pan = doc.employee.pan;
    }
    if (!merged.employee.name.firstName && doc.employee.name.firstName) {
      merged.employee.name.firstName = doc.employee.name.firstName;
    }
    if (!merged.employee.name.middleName && doc.employee.name.middleName) {
      merged.employee.name.middleName = doc.employee.name.middleName;
    }
    if (!merged.employee.name.lastName && doc.employee.name.lastName) {
      merged.employee.name.lastName = doc.employee.name.lastName;
    }
    if (doc.employee.address && (!merged.employee.address || doc.employee.address.length > merged.employee.address.length)) {
      merged.employee.address = doc.employee.address;
    }
  }

  /**
   * Merges assessment year from the document if missing in merged.
   */
  private static mergeAssessmentYear(merged: any, doc: any): void {
    if (!merged.assessmentYear && doc.assessmentYear) {
      merged.assessmentYear = doc.assessmentYear;
    }
  }

  /**
   * Merges start and end dates of the employment period, expanding to the minimum of start dates
   * and the maximum of end dates.
   */
  private static mergePeriod(merged: any, doc: any): void {
    const mergedFromDate = this.parseEmploymentDate(merged.period.from);
    const docFromDate = this.parseEmploymentDate(doc.period.from);

    if (docFromDate) {
      if (!mergedFromDate || docFromDate < mergedFromDate) {
        merged.period.from = doc.period.from;
      }
    } else if (!merged.period.from && doc.period.from) {
      merged.period.from = doc.period.from;
    }

    const mergedToDate = this.parseEmploymentDate(merged.period.to);
    const docToDate = this.parseEmploymentDate(doc.period.to);

    if (docToDate) {
      if (!mergedToDate || docToDate > mergedToDate) {
        merged.period.to = doc.period.to;
      }
    } else if (!merged.period.to && doc.period.to) {
      merged.period.to = doc.period.to;
    }
  }

  /**
   * Parses string dates of formats like '01-Apr-2025' or ISO timestamps.
   */
  private static parseEmploymentDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return new Date(parsed);

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months: Record<string, number> = {
        apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8,
        oct: 9, nov: 10, dec: 11, jan: 0, feb: 1, mar: 2
      };
      const month = months[parts[1].toLowerCase()];
      const day = parseInt(parts[0], 10);
      const year = parseInt(parts[2], 10);

      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  /**
   * Merges salary figures, exempt allowances, and Section 16 deductions.
   */
  private static mergeSalary(merged: any, doc: any): void {
    merged.salary.grossSalary += doc.salary.grossSalary || 0;
    merged.salary.salaryAsPer17_1 += doc.salary.salaryAsPer17_1 || 0;
    merged.salary.perquisites17_2 += doc.salary.perquisites17_2 || 0;
    merged.salary.profitsInLieu17_3 += doc.salary.profitsInLieu17_3 || 0;

    this.mergeExemptAllowances(merged, doc);

    merged.salary.totalExemptAllowances += doc.salary.totalExemptAllowances || 0;
    merged.salary.netSalary += doc.salary.netSalary || 0;

    // Standard deduction is capped at 75,000 for a single taxpayer across all employers
    merged.salary.standardDeduction16ia = Math.max(
      merged.salary.standardDeduction16ia || 0,
      doc.salary.standardDeduction16ia || 0
    );
    if (merged.salary.standardDeduction16ia > 75000) {
      merged.salary.standardDeduction16ia = 75000;
    }

    merged.salary.entertainmentAllowance16ii += doc.salary.entertainmentAllowance16ii || 0;
    merged.salary.professionalTax16iii += doc.salary.professionalTax16iii || 0;
    merged.salary.totalDeductionsUs16 += doc.salary.totalDeductionsUs16 || 0;
    merged.salary.incomeChargeableUnderHeadSalaries += doc.salary.incomeChargeableUnderHeadSalaries || 0;
  }

  /**
   * Combines Section 10 exempt allowances lists.
   */
  private static mergeExemptAllowances(merged: any, doc: any): void {
    const combinedExempts = [...(merged.salary.exemptAllowancesUs10 || [])];

    for (const item of (doc.salary.exemptAllowancesUs10 || [])) {
      if (!item) continue;
      const matchedIdx = combinedExempts.findIndex(
        (x) =>
          x &&
          ((x.code && item.code && x.code.toLowerCase() === item.code.toLowerCase()) ||
            (x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()))
      );

      if (matchedIdx !== -1) {
        combinedExempts[matchedIdx].amount += item.amount || 0;
      } else {
        combinedExempts.push({ ...item });
      }
    }

    merged.salary.exemptAllowancesUs10 = combinedExempts;
  }

  /**
   * Merges other income sources, such as house property and other sources.
   */
  private static mergeOtherIncome(merged: any, doc: any): void {
    merged.otherIncome.houseProperty += doc.otherIncome.houseProperty || 0;

    const combinedOtherSources = [...(merged.otherIncome.otherSources || [])];

    for (const item of (doc.otherIncome.otherSources || [])) {
      if (!item) continue;
      const matchedIdx = combinedOtherSources.findIndex(
        (x) => x && x.nature && item.nature && x.nature.toLowerCase().trim() === item.nature.toLowerCase().trim()
      );

      if (matchedIdx !== -1) {
        combinedOtherSources[matchedIdx].amount += item.amount || 0;
      } else {
        combinedOtherSources.push({ ...item });
      }
    }

    merged.otherIncome.otherSources = combinedOtherSources;
    merged.otherIncome.totalOtherSources += doc.otherIncome.totalOtherSources || 0;
    merged.grossTotalIncome += doc.grossTotalIncome || 0;
  }

  /**
   * Merges Chapter VI-A deductions.
   */
  private static mergeDeductions(merged: any, doc: any): void {
    merged.deductions80C += doc.deductions80C || 0;
    merged.deductions80CCC += doc.deductions80CCC || 0;
    merged.deductions80CCD1 += doc.deductions80CCD1 || 0;
    merged.deductions80CCD1B += doc.deductions80CCD1B || 0;
    merged.deductions80CCD2 += doc.deductions80CCD2 || 0;
    merged.deductions80D += doc.deductions80D || 0;
    merged.deductions80E += doc.deductions80E || 0;
    merged.deductions80G += doc.deductions80G || 0;
    merged.deductions80TTA += doc.deductions80TTA || 0;

    merged.totalChapterVIADeductions += doc.totalChapterVIADeductions || 0;
    merged.totalIncome += doc.totalIncome || 0;
  }

  /**
   * Merges the tax payable field.
   */
  private static mergeTaxPayable(merged: any, doc: any): void {
    merged.taxPayable += doc.taxPayable || 0;
  }

  /**
   * Recalculates all derived totals and sums to ensure overall mathematical consistency.
   */
  private static recalculateDerivedFields(merged: any): void {
    merged.salary.totalExemptAllowances = merged.salary.exemptAllowancesUs10.reduce(
      (sum: number, item: any) => sum + (item?.amount || 0),
      0
    );

    merged.salary.netSalary = Math.max(0, merged.salary.grossSalary - merged.salary.totalExemptAllowances);

    merged.salary.totalDeductionsUs16 =
      (merged.salary.standardDeduction16ia || 0) +
      (merged.salary.entertainmentAllowance16ii || 0) +
      (merged.salary.professionalTax16iii || 0);

    merged.salary.incomeChargeableUnderHeadSalaries = Math.max(
      0,
      merged.salary.netSalary - merged.salary.totalDeductionsUs16
    );

    merged.otherIncome.totalOtherSources = merged.otherIncome.otherSources.reduce(
      (sum: number, item: any) => sum + (item?.amount || 0),
      0
    );

    merged.grossTotalIncome =
      merged.salary.incomeChargeableUnderHeadSalaries +
      (merged.otherIncome.houseProperty || 0) +
      merged.otherIncome.totalOtherSources;

    merged.totalChapterVIADeductions =
      (merged.deductions80C || 0) +
      (merged.deductions80CCC || 0) +
      (merged.deductions80CCD1 || 0) +
      (merged.deductions80CCD1B || 0) +
      (merged.deductions80CCD2 || 0) +
      (merged.deductions80D || 0) +
      (merged.deductions80E || 0) +
      (merged.deductions80G || 0) +
      (merged.deductions80TTA || 0);

    merged.totalIncome = Math.max(0, merged.grossTotalIncome - merged.totalChapterVIADeductions);
  }

  /**
   * Joins two string tokens using a separator if both are distinct.
   */
  private static joinDistinctTokens(existing: string, incoming: string, separator: string): string {
    const existingTokens = existing ? existing.split(separator) : [];
    if (incoming && !existingTokens.includes(incoming)) {
      if (!existing) return incoming;
      return existing + separator + incoming;
    }
    return existing;
  }
}
