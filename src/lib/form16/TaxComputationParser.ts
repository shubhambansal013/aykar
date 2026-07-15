import { Form16Data } from '../types';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

export class TaxComputationParser {
  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.taxComputation;

    data.grossTotalIncome = ParserUtils.extractAmount(text, config.grossTotalIncome);
    if (data.grossTotalIncome === 0) {
      data.grossTotalIncome = data.salary.incomeChargeableUnderHeadSalaries + data.otherIncome.houseProperty + data.otherIncome.totalOtherSources;
    }

    data.totalIncome = ParserUtils.extractAmount(text, config.totalIncome);
    if (data.totalIncome === 0) {
      data.totalIncome = data.grossTotalIncome - data.totalChapterVIADeductions;
    }

    data.taxPayable = ParserUtils.extractAmount(text, config.taxPayable);
  }
}
