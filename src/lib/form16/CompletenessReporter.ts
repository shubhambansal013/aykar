export interface FieldStatus {
  fieldName: string;
  found: boolean;
  value?: any;
}

export interface CompletenessReport {
  score: number; // 0 to 100
  totalFields: number;
  foundFields: number;
  fieldStatuses: FieldStatus[];
}

export class CompletenessReporter {
  /**
   * Generates a completeness and confidence report based on the populated fields
   * of the parsed Form 16 data.
   */
  public static calculate(data: any): CompletenessReport {
    const fieldStatuses: FieldStatus[] = [];

    const checkField = (name: string, value: any, validator?: (v: any) => boolean) => {
      const found = validator
        ? validator(value)
        : (value !== undefined && value !== null && value !== '' && (typeof value !== 'number' || !isNaN(value)));
      fieldStatuses.push({
        fieldName: name,
        found,
        value: found ? value : undefined,
      });
    };

    // Filer & Employer Info
    checkField('Employer Name', data?.employer?.name);
    checkField('Employer TAN', data?.employer?.tan);
    checkField('Employer PAN', data?.employer?.pan);
    checkField('Employee PAN', data?.employee?.pan);
    checkField('Assessment Year', data?.assessmentYear);

    // Salary & Deductions
    checkField('Gross Salary', data?.salary?.grossSalary);
    checkField('Salary u/s 17(1)', data?.salary?.salaryAsPer17_1);
    checkField('Standard Deduction u/s 16(ia)', data?.salary?.standardDeduction16ia);
    checkField('Total Deductions u/s 16', data?.salary?.totalDeductionsUs16);
    checkField('Total Taxable Income', data?.totalIncome);
    checkField('Tax Payable', data?.taxPayable);

    const foundFields = fieldStatuses.filter(f => f.found).length;
    const totalFields = fieldStatuses.length;
    const score = Math.round((foundFields / totalFields) * 100);

    return {
      score,
      totalFields,
      foundFields,
      fieldStatuses,
    };
  }
}
