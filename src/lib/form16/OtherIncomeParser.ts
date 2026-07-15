import { Form16Data } from '../types';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

export class OtherIncomeParser {
  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.otherIncome;

    data.otherIncome.houseProperty = ParserUtils.extractAmount(text, config.houseProperty);
    data.otherIncome.totalOtherSources = ParserUtils.extractAmount(text, config.totalOtherSources);

    if (data.otherIncome.totalOtherSources !== 0) {
      data.otherIncome.otherSources = [{
        nature: 'Other Sources',
        amount: data.otherIncome.totalOtherSources
      }];
    }
  }
}
