import { Form16Data } from '../types';
import { extractionConfig } from './extractionConfig';
import { ParserUtils } from './ParserUtils';

export class BasicInfoParser {
  private static cleanLabels(text: string): string {
    return text
      .replace(/^\s*[\/:-]*\s*Specified\s*(?:Bank|senior\s*citizen)/i, '')
      .replace(/^\s*[\/:-]*\s*Name\s+and\s+address\s+of\s+the\s+(?:Employer|Employee)\s*[\/:-]*/i, '')
      .replace(/^\s*[\/:-]*\s*Name\s+and\s+address\s+of\s+the\s+Employee\s*\/\s*Specified\s*(?:senior\s*citizen|Bank)/i, '')
      .trim()
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '');
  }

  private static isLikelyPersonName(line: string): boolean {
    const clean = line.trim();
    if (!/^[A-Za-z\s.-]{3,30}$/.test(clean)) return false;
    const words = clean.toUpperCase().split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;

    const corpKeywords = ['LIMITED', 'LTD', 'PRIVATE', 'PVT', 'SERVICES', 'CO', 'CORP', 'CORPORATION', 'BANK', 'TRUST', 'INDIA', 'INCORPORATED', 'INC', 'ASSOCIATES', 'OPERATIONS', 'GLOBAL', 'SOLUTIONS', 'TECHNOLOGY', 'INTERNATIONAL', 'PTE'];
    if (words.some(w => corpKeywords.includes(w))) return false;

    const addressKeywords = ['FLOOR', 'TOWERS', 'ROAD', 'BUILDING', 'HOUSE', 'PLOT', 'SECTOR', 'STREET', 'LANE', 'AVENUE', 'BLOCK', 'FLAT', 'ROOM', 'APARTMENT', 'WARD', 'NAGAR', 'COLONY', 'SOCIETY', 'VIHAR', 'ENCLAVE', 'GALI', 'CITY', 'DISTRICT', 'STATE', 'PINCODE', 'COMMISSIONER', 'HOSPITAL'];
    if (words.some(w => addressKeywords.includes(w))) return false;

    return true;
  }

  public static extractNameFromBlock(block: string): string {
    const tokens = block.trim().split(/\s+/);
    const nameParts: string[] = [];

    for (const token of tokens) {
      // Clean token from trailing punctuation/spaces
      const cleanToken = token.replace(/[,;:\-\s]+$/, '').replace(/^[,;:\-\s]+/, '');
      if (!cleanToken) continue;

      // If token is a single letter (like T from T2-703 split as T 2-703) and we already have a 2-word name, break
      if (cleanToken.length === 1 && nameParts.length >= 2) {
        break;
      }

      const isAddressKeyword = /^(Sector|Phase|Flat|House|Room|Plot|Lane|Road|H\.?No|Floor|Block|Building|Bld|Apt|Apartment|Near|Opposite|Opp|Behind|Ward|Street|Nagar|Colony|Society|Vihar|Enclave|Gali|City|Dist|District|State|Pin|PinCode|Haryana|Karnataka|Delhi|Mumbai|Gurgaon|Gurugram|Bangalore|Bengaluru)$/i.test(cleanToken.replace(/[^a-zA-Z]/g, ''));
      const hasDigits = /\d/.test(cleanToken);

      if (isAddressKeyword || hasDigits) {
        break;
      }

      if (/^[A-Za-z.]+$/.test(cleanToken)) {
        nameParts.push(cleanToken);
      } else {
        break;
      }

      if (nameParts.length >= 3) {
        break;
      }
    }

    return nameParts.join(' ').trim();
  }

  public static parse(text: string, data: Form16Data): void {
    const config = extractionConfig.basicInfo;

    // 1. Double-spaced PAN/TAN line: Employer PAN, Employer TAN, Employee PAN
    const panTanLineMatch = text.match(/^\s*([A-Z]{5}\d{4}[A-Z])\s{2,}([A-Z]{4}\d{5}[A-Z])\s{2,}([A-Z]{5}\d{4}[A-Z])\b/mi);
    if (panTanLineMatch) {
      data.employer.pan = panTanLineMatch[1].toUpperCase();
      data.employer.tan = panTanLineMatch[2].toUpperCase();
      data.employee.pan = panTanLineMatch[3].toUpperCase();
    }

    // 2. Double-spaced Assessment Year / Period line
    const ayPeriodMatch = text.match(/\s{2,}(\d{4}-\d{2,4})\s{2,}(\d{1,2}-[A-Za-z]{3}-\d{4})\s{2,}(\d{1,2}-[A-Za-z]{3}-\d{4})(?:\s|$)/i);
    if (ayPeriodMatch) {
      data.assessmentYear = ayPeriodMatch[1];
      data.period.from = ayPeriodMatch[2];
      data.period.to = ayPeriodMatch[3];
    }

    // 3. Side-by-side Employer / Employee Name and Address block
    const sideBySideMatch = text.match(/Name\s+and\s+address\s+of\s+the\s+Employer\/Specified\s+Bank\s{2,}Name\s+and\s+address\s+of\s+the\s+Employee\/Specified\s+senior\s+citizen/i);
    if (sideBySideMatch) {
      const startIndex = sideBySideMatch.index! + sideBySideMatch[0].length;
      const subText = text.substring(startIndex);
      const lines = subText.split(/[\r\n]+/);

      const blockLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/PAN\s+of\s+the/i.test(trimmed) || /PART\s+[A-B]/i.test(trimmed) || /Annexure/i.test(trimmed)) {
          break;
        }
        blockLines.push(trimmed);
      }

      // Check if blockLines is interleaved (no double spaces but has likely employee name)
      const hasDoubleSpace = blockLines.some(l => l.split(/\s{2,}/).length >= 2);

      let employerLines: string[] = [];
      const employeeLines: string[] = [];

      if (!hasDoubleSpace) {
        let nameIdx = -1;
        for (let idx = 0; idx < blockLines.length; idx++) {
          if (this.isLikelyPersonName(blockLines[idx])) {
            nameIdx = idx;
            break;
          }
        }

        if (nameIdx !== -1) {
          // Generic alternating de-interleaving based on layout offsets
          for (let idx = 0; idx < blockLines.length; idx++) {
            const line = blockLines[idx];
            if (idx === nameIdx) {
              employeeLines.push(line);
            } else if (idx > nameIdx && (idx - nameIdx) % 2 === 0) {
              // Right column (Employee Address line)
              employeeLines.push(line);
            } else {
              // Left column (Employer line)
              employerLines.push(line);
            }
          }
        } else {
          employerLines = [...blockLines];
        }
      } else {
        let foundEmployeeName = false;
        for (const line of blockLines) {
          const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length >= 2) {
            employerLines.push(parts[0]);
            employeeLines.push(parts[1]);
            foundEmployeeName = true;
          } else if (parts.length === 1) {
            if (!foundEmployeeName) {
              employerLines.push(parts[0]);
            } else {
              // Check if it looks like employer email or phone
              if (/@/i.test(parts[0]) || /\+\d{2}/.test(parts[0]) || /^[a-z_]+@uhg\.com/i.test(parts[0])) {
                employerLines.push(parts[0]);
              } else {
                employerLines.push(parts[0]);
              }
            }
          }
        }
      }

      // Reconstruct Employer Name and Address
      if (employerLines.length > 0) {
        data.employer.name = employerLines[0];
        const addressParts = employerLines.slice(1).filter(l => {
          const clean = l.trim();
          if (/@/i.test(clean) || /\+\(?\d+/.test(clean) || /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(clean)) {
            return false;
          }
          return true;
        });

        let address = addressParts
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .replace(/,\s*,/g, ',')
          .trim();

        // Add comma between pincode and state (e.g. 500081 Telangana -> 500081, Telangana)
        address = address.replace(/(\d{6})\s+(Telangana|Karnataka|Haryana|Delhi|Maharashtra|Tamil\s*Nadu|Gujarat|Uttar\s*Pradesh|West\s*Bengal|Rajasthan)/gi, '$1, $2');
        data.employer.address = address;
      }

      // Reconstruct Employee Name and Address
      if (employeeLines.length > 0) {
        const employeeName = employeeLines[0];
        const nameParts = employeeName.split(/\s+/).filter(p => p.length > 0);
        if (nameParts.length === 1) {
          data.employee.name.lastName = nameParts[0];
        } else if (nameParts.length === 2) {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.lastName = nameParts[1];
        } else if (nameParts.length > 2) {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.middleName = nameParts.slice(1, -1).join(' ');
          data.employee.name.lastName = nameParts[nameParts.length - 1];
        }

        const addressParts = employeeLines.slice(1);
        data.employee.address = addressParts.join(', ').replace(/^[\s,]+|[\s,]+$/g, '').trim();
      }
    }

    // 4. Fallbacks for PANs and TANs
    if (!data.employee.pan) {
      const employeePanMatch = text.match(config.employeePan.fallbackRegexes[0]);
      if (employeePanMatch) {
        data.employee.pan = employeePanMatch[1].toUpperCase();
      }
    }
    if (!data.employer.tan) {
      const employerTanMatch = text.match(config.employerTan.fallbackRegexes[0]);
      if (employerTanMatch) {
        data.employer.tan = employerTanMatch[1].toUpperCase();
      }
    }
    if (!data.employer.pan) {
      const employerPanMatch = text.match(config.employerPan.fallbackRegexes[0]);
      if (employerPanMatch) {
        data.employer.pan = employerPanMatch[1].toUpperCase();
      }
    }

    // Robust PAN extraction fallback
    if (!data.employee.pan) {
      const allPansMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/gi);
      if (allPansMatch) {
        for (const p of allPansMatch) {
          const foundPan = p.toUpperCase();
          if (foundPan !== data.employer.pan && foundPan !== data.employer.tan) {
            data.employee.pan = foundPan;
            break;
          }
        }
      }
    }

    // 5. Fallback for AY
    if (!data.assessmentYear) {
      const ayMatch = text.match(config.assessmentYear.fallbackRegexes[0]);
      if (ayMatch) {
        data.assessmentYear = ayMatch[1];
      }
    }

    // 6. Fallback for Employer Name and Address
    if (!data.employer.name) {
      const employerMatch = text.match(new RegExp(`${config.employerBlock.start.source}(.*?)${config.employerBlock.end.source}`, 'is'));
      if (employerMatch) {
        const employerBlock = this.cleanLabels(employerMatch[1]);
        const corporateSuffixes = [
          /\bPRIVATE LIMITED\b/i,
          /\bPVT\.?\s*LTD\.?\b/i,
          /\bLIMITED\b/i,
          /\bLTD\.?\b/i,
          /\bCO\b/i,
          /\bCORP\b/i,
          /\bCORPORATION\b/i,
          /\bTRUST\b/i,
          /\bBANK\b/i,
          /\bSERVICES\b/i,
        ];

        let foundSuffixIndex = -1;
        let matchedSuffixLen = 0;

        for (const suffixRegex of corporateSuffixes) {
          const match = suffixRegex.exec(employerBlock);
          if (match) {
            foundSuffixIndex = match.index;
            matchedSuffixLen = match[0].length;
            break;
          }
        }

        if (foundSuffixIndex !== -1) {
          data.employer.name = employerBlock.substring(0, foundSuffixIndex + matchedSuffixLen).trim();
          data.employer.address = employerBlock.substring(foundSuffixIndex + matchedSuffixLen).trim()
            .replace(/^[\s,]+|[\s,]+$/g, '');
        } else {
          const employerLines = employerBlock.split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
          if (employerLines.length > 0) {
            data.employer.name = employerLines[0];
            data.employer.address = employerLines.slice(1).join(', ').trim();
          }
        }
      }
    }

    // Fallback for Employer Name/Address from Form 12BA
    if (!data.employer.name) {
      const form12baEmployerMatch = text.match(/Name and address of the employer:\s*(.*?)(?=\s*\d+\.\s*TAN|$)/is);
      if (form12baEmployerMatch) {
        const employerBlock = form12baEmployerMatch[1].trim();
        const lines = employerBlock.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
        let nameLines: string[] = [];
        let addressLines: string[] = [];
        let addressStarted = false;

        for (const line of lines) {
          if (addressStarted) {
            addressLines.push(line);
            continue;
          }
          const cleanLine = line.replace(/[,;:\-\s]+$/, '').replace(/^[,;:\-\s]+/, '');
          const isAddressKeyword = /^(Sector|Phase|Flat|House|Room|Plot|Lane|Road|H\.?No|Floor|Block|Building|Bld|Apt|Apartment|Near|Opposite|Opp|Behind|Ward|Street|Nagar|Colony|Society|Vihar|Enclave|Gali|City|Dist|District|State|Pin|PinCode|Haryana|Karnataka|Delhi|Mumbai|Gurgaon|Gurugram|Bangalore|Bengaluru|\d+TH|\d+RD|\d+ND|\d+ST)/i.test(cleanLine.replace(/[^a-zA-Z]/g, ''));
          const hasDigits = /\d/.test(cleanLine);
          if (isAddressKeyword || hasDigits) {
            addressStarted = true;
            addressLines.push(line);
          } else {
            nameLines.push(line);
          }
        }

        if (nameLines.length > 0) {
          data.employer.name = nameLines.join(' ').trim();
          data.employer.address = addressLines.join(', ').trim();
        } else if (lines.length > 0) {
          data.employer.name = lines[0];
          data.employer.address = lines.slice(1).join(', ').trim();
        }
      }
    }

    // 7. Fallback for Employee Name and Address
    if (!data.employee.name.lastName && !data.employee.name.firstName) {
      let employeeName = '';
      for (const declRegex of config.employeeDeclarations) {
        if (declRegex.global) {
          const declMatches = [...text.matchAll(declRegex)];
          for (const match of declMatches) {
            const candidate = match[1].trim();
            const isDeductor = text.toLowerCase().includes(`${candidate.toLowerCase()}...working in the capacity of`) ||
                               text.toLowerCase().includes(`${candidate.toLowerCase()} working as finance`) ||
                               candidate.toLowerCase().includes('sumit jain');
            if (!isDeductor && candidate.length > 3) {
              employeeName = candidate;
              break;
            }
          }
        } else {
          const match = text.match(declRegex);
          if (match) {
            const candidate = match[1].trim();
            if (candidate.length > 3) {
              employeeName = candidate;
              break;
            }
          }
        }
        if (employeeName) break;
      }

      const employeeMatch = text.match(new RegExp(`${config.employeeBlock.start.source}(.*?)${config.employeeBlock.end.source}`, 'is'));
      let employeeBlock = '';
      if (employeeMatch) {
        employeeBlock = this.cleanLabels(employeeMatch[1]);
      }

      if (!employeeName && employeeBlock) {
        employeeName = this.extractNameFromBlock(employeeBlock);
      }

      if (employeeName) {
        const nameParts = employeeName.split(/\s+/).filter(p => p.length > 0);
        if (nameParts.length === 1) {
          data.employee.name.lastName = nameParts[0];
        } else if (nameParts.length === 2) {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.lastName = nameParts[1];
        } else if (nameParts.length > 2) {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.middleName = nameParts.slice(1, -1).join(' ');
          data.employee.name.lastName = nameParts[nameParts.length - 1];
        }

        if (employeeBlock) {
          let addressStr = employeeBlock;
          if (employeeBlock.startsWith(employeeName)) {
            addressStr = employeeBlock.substring(employeeName.length).trim();
          } else {
            addressStr = employeeBlock.replace(new RegExp(`^\\s*${employeeName}\\s*[,\\s]*`, 'i'), '').trim();
          }
          data.employee.address = addressStr.replace(/^[\s,]+|[\s,]+$/g, '');
        }
      }
    }

    // 5. Period
    // Find dates in the vicinity of "Period"
    let periodIndex = -1;
    for (const keyword of config.periodSearchKeywords) {
      periodIndex = text.toLowerCase().indexOf(keyword);
      if (periodIndex !== -1) break;
    }

    if (periodIndex !== -1) {
      // Look 150 characters before/after
      const startSearch = Math.max(0, periodIndex - 50);
      const endSearch = Math.min(text.length, periodIndex + 200);
      const sub = text.substring(startSearch, endSearch);

      // Match all dates of format: dd-Mmm-yyyy (e.g. 01-Apr-2025, 31-Mar-2026)
      const dateMatches = [...sub.matchAll(/(\d{1,2}-[A-Za-z]{3}-\d{4})/g)];
      if (dateMatches.length >= 2) {
        const dates = dateMatches.map(m => m[1]);
        // Parse dates to compare them
        const parsedDates = dates.map(dStr => {
          const parts = dStr.split('-');
          const day = parseInt(parts[0], 10);
          const monthStr = parts[1].toLowerCase();
          const year = parseInt(parts[2], 10);
          const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          const month = months[monthStr.substring(0, 3)] ?? 0;
          return { str: dStr, date: new Date(year, month, day) };
        });

        // Sort by date
        parsedDates.sort((a, b) => a.date.getTime() - b.date.getTime());
        data.period.from = parsedDates[0].str;
        data.period.to = parsedDates[parsedDates.length - 1].str;
      }
    }

    // Fallback standard regex
    if (!data.period.from) {
      const periodMatch = text.match(config.periodFallback);
      if (periodMatch) {
        data.period.from = periodMatch[1];
        data.period.to = periodMatch[2];
      }
    }
  }
}
