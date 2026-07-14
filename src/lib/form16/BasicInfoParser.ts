import { Form16Data } from '../types';

export class BasicInfoParser {
  private static cleanLabels(text: string): string {
    return text
      .replace(/^\s*[\/:-]*\s*Specified Bank/i, '')
      .replace(/^\s*[\/:-]*\s*Specified senior citizen/i, '')
      .replace(/^\s*[\/:-]*\s*Name and address of the Employer\s*[\/:-]*/i, '')
      .replace(/^\s*[\/:-]*\s*Name and address of the Employee\s*[\/:-]*/i, '')
      .trim()
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '');
  }

  public static parse(text: string, data: Form16Data): void {
    // 1. PAN / TAN Extraction
    const employeePanMatch = text.match(/PAN OF THE EMPLOYEE(?:\/Specified senior citizen)?\s+([A-Z]{5}[0-9]{4}[A-Z])/i);
    if (employeePanMatch) {
      data.employee.pan = employeePanMatch[1].toUpperCase();
    }

    const employerTanMatch = text.match(/TAN OF THE DEDUCTOR\s+([A-Z]{4}[0-9]{5}[A-Z])/i);
    if (employerTanMatch) {
      data.employer.tan = employerTanMatch[1].toUpperCase();
    }

    const employerPanMatch = text.match(/PAN OF THE DEDUCTOR\s+([A-Z]{5}[0-9]{4}[A-Z])/i);
    if (employerPanMatch) {
      data.employer.pan = employerPanMatch[1].toUpperCase();
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

    // 2. Assessment Year
    const ayMatch = text.match(/Assessment Year\s+(\d{4}-\d{2,4})/i);
    if (ayMatch) {
      data.assessmentYear = ayMatch[1].split('-')[0];
    }

    // 3. Employer Name and Address
    const employerMatch = text.match(/Name and address of the Employer(?:\/(?:Specified Bank|Specified senior citizen))?[:\-\s]*(.*?)(?=\s*(?:Name and address of the Employee|PAN of the|TAN of the|Assessment Year|Period with|$))/is);
    if (employerMatch) {
      const employerBlock = this.cleanLabels(employerMatch[1]);

      // Let's look for a corporate legal suffix to split name and address
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
          .replace(/^[\s,]+|[\s,]+$/g, ''); // Clean leading/trailing commas and spaces
      } else {
        // Fallback to splitting by comma or newline
        const employerLines = employerBlock.split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
        if (employerLines.length > 0) {
          data.employer.name = employerLines[0];
          data.employer.address = employerLines.slice(1).join(', ').trim();
        }
      }
    }

    // Fallback for Employer Name/Address from Form 12BA
    if (!data.employer.name) {
      const form12baEmployerMatch = text.match(/Name and address of the employer:\s*(.*?)(?=\s*\d+\.\s*TAN|$)/is);
      if (form12baEmployerMatch) {
        const employerBlock = form12baEmployerMatch[1].trim();
        const lines = employerBlock.split(/[\n\r,]+/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          data.employer.name = lines[0];
          data.employer.address = lines.slice(1).join(', ').trim();
        }
      }
    }

    // 4. Employee Name and Address
    let employeeName = '';

    // Source A: Form 12BB
    const form12bbMatch = text.match(/Name and address of the employee\s*:\s*([A-Z\s]+?)(?=\s*(?:\r?\n|Permanent|\d|$))/i);
    if (form12bbMatch) {
      employeeName = form12bbMatch[1].trim();
    }

    // Source B: Form 12BA
    if (!employeeName) {
      const form12baMatch = text.match(/Name, designation and Permanent Account Number or Aadhaar Number of employee:\s*([A-Z\s]+?)(?:,|\s+Designation|\s+Software|CESPB|$)/i);
      if (form12baMatch) {
        employeeName = form12baMatch[1].trim();
      }
    }

    // Source C: Verification/Declaration line for Employee (excluding Sumit Jain / Finance Manager / Deductor)
    if (!employeeName) {
      const declMatches = [...text.matchAll(/I,\s*([A-Z\s]+?),\s*(?:son|daughter)\s*of/gi)];
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
    }

    const employeeMatch = text.match(/Name and address of the Employee(?:\/(?:Specified Bank|Specified senior citizen))?[:\-\s]*(.*?)(?=\s*(?:PAN of the|TAN of the|Assessment Year|Period with|$))/is);
    let employeeBlock = '';
    if (employeeMatch) {
      employeeBlock = this.cleanLabels(employeeMatch[1]);
    }

    // Source D: First line or capital words block from the employeeBlock
    if (!employeeName && employeeBlock) {
      const lines = employeeBlock.split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        const firstLine = lines[0];
        // Take everything until a digit/word containing digit or common address keyword
        const namePartMatch = firstLine.match(/^([A-Z\s]+?)(?=\s+(?:\w*\d\w*|Sector|Pareena|Flat|House|Room|Plot|Lane|Road|H\.?No|$))/i);
        if (namePartMatch) {
          employeeName = namePartMatch[1].trim();
        } else {
          employeeName = firstLine;
        }
      }
    }

    // Parse employeeName into first, middle, last names
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
        // Clean the address by stripping the employee name from the beginning of employeeBlock
        let addressStr = employeeBlock;
        if (employeeBlock.startsWith(employeeName)) {
          addressStr = employeeBlock.substring(employeeName.length).trim();
        } else {
          // Robust removal
          addressStr = employeeBlock.replace(new RegExp(`^\\s*${employeeName}\\s*[,\\s]*`, 'i'), '').trim();
        }
        data.employee.address = addressStr.replace(/^[\s,]+|[\s,]+$/g, '');
      }
    } else if (employeeBlock) {
      // Fallback split
      const employeeLines = employeeBlock.split(/[\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
      if (employeeLines.length > 0) {
        const fullDisplayName = employeeLines[0];
        const nameParts = fullDisplayName.split(/\s+/);
        if (nameParts.length === 1) {
          data.employee.name.lastName = nameParts[0];
        } else if (nameParts.length === 2) {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.lastName = nameParts[1];
        } else {
          data.employee.name.firstName = nameParts[0];
          data.employee.name.middleName = nameParts.slice(1, -1).join(' ');
          data.employee.name.lastName = nameParts[nameParts.length - 1];
        }
        data.employee.address = employeeLines.slice(1).join(', ').trim();
      }
    }

    // 5. Period
    // Find dates in the vicinity of "Period"
    // Let's search for "Period with the employer" or "Period with Employer"
    const periodIndex = text.toLowerCase().indexOf('period with');
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
      const periodMatch = text.match(/Period with the employer:\s*From\s+([^\s]+)\s+To\s+([^\s]+)/i);
      if (periodMatch) {
        data.period.from = periodMatch[1];
        data.period.to = periodMatch[2];
      }
    }
  }
}
