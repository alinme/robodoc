import XLSX from 'xlsx';
import fs from 'fs';
import { validateAndFormatPhone } from './phoneValidator.js';

export function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    
    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Get first row as default headers (can be changed by user)
      const defaultHeaders = data[0] || [];
      
      // Get preview of first 10 rows to help user identify header row
      const preview = data.slice(0, 10).map((row, index) => ({
        rowNumber: index + 1, // 1-indexed
        cells: row
      }));
      
      // Filter out completely empty rows for row count
      const nonEmptyRows = data.filter(row => row.some(cell => cell !== ''));
      
      return {
        name,
        headers: defaultHeaders,
        rowCount: nonEmptyRows.length,
        totalRows: data.length,
        preview: preview // Show first 10 rows with row numbers
      };
    });

    return {
      success: true,
      sheets
    };
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function extractContactsFromSheet(filePath, sheetName, columnMapping, rules = [], headerRow = 1) {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Get raw data as array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Validate header row (convert from 1-indexed to 0-indexed)
    const headerRowIndex = headerRow - 1;
    if (headerRowIndex < 0 || headerRowIndex >= rawData.length) {
      throw new Error(`Header row ${headerRow} is out of range`);
    }

    // Get headers from specified row
    const headers = rawData[headerRowIndex] || [];
    
    // Get data rows (everything after header row)
    const dataRows = rawData.slice(headerRowIndex + 1);
    
    const contacts = [];
    
    for (const row of dataRows) {
      // Skip completely empty rows
      if (!row.some(cell => cell !== '')) {
        continue;
      }

      // Create an object mapping header names to row values
      const rowObject = {};
      headers.forEach((header, index) => {
        if (header) {
          rowObject[header] = row[index] || '';
        }
      });
      
      // Extract values based on column mapping
      const name = columnMapping.name_column ? rowObject[columnMapping.name_column] : '';
      const phone = columnMapping.phone_column ? rowObject[columnMapping.phone_column] : '';
      const email = columnMapping.email_column ? rowObject[columnMapping.email_column] : '';
      const group = columnMapping.group_column ? rowObject[columnMapping.group_column] : '';
      const business = columnMapping.business_column ? rowObject[columnMapping.business_column] : '';
      
      // Skip if required fields are missing
      if (!name || !phone) {
        continue;
      }

      // Apply rules/filters
      let shouldInclude = true;
      for (const rule of rules) {
        if (!rule.is_active) continue;
        
        const columnValue = rowObject[rule.column_name];
        
        switch (rule.operator) {
          case 'exists':
          case 'not_empty':
            if (!columnValue || columnValue.toString().trim() === '') {
              shouldInclude = false;
            }
            break;
          case 'empty':
            if (columnValue && columnValue.toString().trim() !== '') {
              shouldInclude = false;
            }
            break;
          case 'equals':
            if (columnValue !== rule.value) {
              shouldInclude = false;
            }
            break;
          case 'contains':
            if (!columnValue || !columnValue.toString().includes(rule.value)) {
              shouldInclude = false;
            }
            break;
          case 'not_contains':
            if (columnValue && columnValue.toString().includes(rule.value)) {
              shouldInclude = false;
            }
            break;
        }
        
        if (!shouldInclude) break;
      }
      
      if (!shouldInclude) {
        continue;
      }

      // Store raw row data as JSON
      const rawDataJson = JSON.stringify(rowObject);
      
      // Validate and format phone number
      const phoneValidation = validateAndFormatPhone(phone.toString().trim());
      
      // Skip if phone number is invalid
      if (!phoneValidation.valid) {
        console.warn(`Skipping contact "${name}" - Invalid phone number: ${phoneValidation.error}`);
        continue;
      }
      
      contacts.push({
        name: name.toString().trim(),
        phone: phoneValidation.formatted,
        email: email ? email.toString().trim() : null,
        group: group ? group.toString().trim() : null,
        business: business ? business.toString().trim() : null,
        rawData: rawDataJson
      });
    }

    return {
      success: true,
      contacts,
      totalRows: dataRows.length,
      importedCount: contacts.length
    };
  } catch (error) {
    console.error('Error extracting contacts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function getSheetData(filePath, sheetName, headerRow = 1) {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawData.length) {
      return {
        success: true,
        headers: [],
        rows: [],
        totalRows: 0
      };
    }

    const headerRowIndex = Math.max(0, headerRow - 1);
    if (headerRowIndex >= rawData.length) {
      throw new Error(`Header row ${headerRow} is out of range`);
    }

    const rawHeaders = rawData[headerRowIndex] || [];

    // Generate normalized headers with fallbacks for empty cells and duplicates
    const headerUsage = new Map();
    const headers = rawHeaders.map((headerCell, index) => {
      const baseHeader = String(headerCell ?? '').trim() || `Column ${index + 1}`;
      const usageCount = headerUsage.get(baseHeader) ?? 0;
      headerUsage.set(baseHeader, usageCount + 1);

      if (usageCount === 0) {
        return baseHeader;
      }

      return `${baseHeader} (${usageCount + 1})`;
    });

    const dataRows = rawData.slice(headerRowIndex + 1).reduce((accumulator, row, rowIndex) => {
      const rowObject = {};
      let hasValue = false;

      headers.forEach((header, columnIndex) => {
        const cellValue = row[columnIndex] ?? '';
        if (cellValue !== '' && cellValue !== null && cellValue !== undefined) {
          hasValue = true;
        }
        rowObject[header] = cellValue;
      });

      if (hasValue) {
        accumulator.push({
          id: rowIndex + 1,
          originalRowNumber: headerRowIndex + rowIndex + 2, // +2 converts to 1-indexed row after header
          data: rowObject
        });
      }

      return accumulator;
    }, []);

    return {
      success: true,
      headers,
      rows: dataRows,
      totalRows: dataRows.length
    };
  } catch (error) {
    console.error('Error getting sheet data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function extractCentralizatorFromSheet(filePath, sheetName, columnMapping, headerRow = 1) {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const headerRowIndex = headerRow - 1;
    if (headerRowIndex < 0 || headerRowIndex >= rawData.length) {
      throw new Error(`Header row ${headerRow} is out of range`);
    }

    const headers = rawData[headerRowIndex] || [];
    const dataRows = rawData.slice(headerRowIndex + 1);
    const records = [];

    for (const row of dataRows) {
      if (!row.some(cell => cell !== '')) {
        continue;
      }

      const rowObject = {};
      headers.forEach((header, index) => {
        if (header) {
          rowObject[header] = row[index] ?? '';
        }
      });

      const schoolName = columnMapping.school_name_column
        ? rowObject[columnMapping.school_name_column]
        : '';
      const address = columnMapping.address_column
        ? rowObject[columnMapping.address_column]
        : '';
      const protocolNumber = columnMapping.protocol_number_column
        ? rowObject[columnMapping.protocol_number_column]
        : '';

      const normalizedSchool = schoolName ? schoolName.toString().trim() : '';
      if (!normalizedSchool) {
        continue;
      }

      records.push({
        schoolName: normalizedSchool,
        address: address ? address.toString().trim() : '',
        stateRegion: sheetName,
        protocolNumber: protocolNumber ? protocolNumber.toString().trim() : '',
        rawData: JSON.stringify(rowObject)
      });
    }

    return {
      success: true,
      records,
      totalRows: dataRows.length,
      importedCount: records.length
    };
  } catch (error) {
    console.error('Error extracting centralizator data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export function extractCentralizatorFromWorkbookWithConfigs(filePath, sheetConfigs = []) {
  try {
    const workbook = XLSX.readFile(filePath);
    const records = [];
    let totalRows = 0;

    const configBySheet = new Map();
    sheetConfigs.forEach(config => {
      if (config?.sheetName) {
        configBySheet.set(config.sheetName, config);
      }
    });

    for (const sheetName of workbook.SheetNames) {
      const sheetConfig = configBySheet.get(sheetName);
      if (!sheetConfig) {
        throw new Error(`Missing configuration for sheet "${sheetName}"`);
      }

      const headerRow = Number(sheetConfig.headerRow) || 1;
      const columnMapping = sheetConfig.columnMapping || {};
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      const headerRowIndex = headerRow - 1;
      if (headerRowIndex < 0 || headerRowIndex >= rawData.length) {
        throw new Error(`Header row ${headerRow} is out of range for sheet "${sheetName}"`);
      }

      const headers = rawData[headerRowIndex] || [];
      const dataRows = rawData.slice(headerRowIndex + 1);
      totalRows += dataRows.length;

      for (const row of dataRows) {
        if (!row.some(cell => cell !== '')) {
          continue;
        }

        const rowObject = {};
        headers.forEach((header, index) => {
          if (header) {
            rowObject[header] = row[index] ?? '';
          }
        });

        const schoolName = columnMapping.school_name_column
          ? rowObject[columnMapping.school_name_column]
          : '';
        const address = columnMapping.address_column
          ? rowObject[columnMapping.address_column]
          : '';
        const protocolNumber = columnMapping.protocol_number_column
          ? rowObject[columnMapping.protocol_number_column]
          : '';

        const normalizedSchool = schoolName ? schoolName.toString().trim() : '';
        if (!normalizedSchool) {
          continue;
        }

        records.push({
          schoolName: normalizedSchool,
          address: address ? address.toString().trim() : '',
          stateRegion: sheetName,
          protocolNumber: protocolNumber ? protocolNumber.toString().trim() : '',
          rawData: JSON.stringify(rowObject)
        });
      }
    }

    return {
      success: true,
      records,
      totalRows,
      importedCount: records.length
    };
  } catch (error) {
    console.error('Error extracting centralizator workbook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

