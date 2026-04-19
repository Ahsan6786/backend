const xlsx = require('xlsx');

// Standard mappings for common Excel headers
const HEADER_MAPPING = {
  'name': ['name', 'full name', 'student name', 'fullname', 'student_name', 'names', 'student', 'candidate name', 'user name'],
  'email': ['email', 'email address', 'email id', 'email_address', 'email_id', 'mail', 'e-mail', 'student email', 'official email'],
  'panel': ['panel', 'batch', 'group', 'panel_name', 'section', 'panels', 'student group'],
  'facultyId': ['facultyid', 'faculty_id', 'faculty', 'mentor', 'mentor_id', 'assigned faculty', 'faculty id', 'teacher id'],
  'division': ['division', 'div', 'div_name', 'student_division', 'div no'],
  'school': ['school', 'inst', 'institute', 'college', 'school_name', 'campus'],
  'department': ['department', 'dept', 'branch', 'dept_name', 'stream', 'major'],
  'role': ['role', 'type', 'user_type', 'user type', 'position', 'category', 'designation', 'status']
};

/**
 * Normalizes a header string to a standard internal key.
 * @param {string} header - The raw header string from Excel.
 * @returns {string|null} - The standardized key or null if not mapped.
 */
const getStandardKey = (header) => {
  const normalized = header.toLowerCase().trim().replace(/[\s_-]/g, '');
  for (const [standardKey, variations] of Object.entries(HEADER_MAPPING)) {
    if (standardKey.toLowerCase() === normalized || 
        variations.some(v => v.replace(/[\s_-]/g, '').toLowerCase() === normalized)) {
      return standardKey;
    }
  }
  return null;
};

/**
 * Parses an Excel file and returns normalized JSON data.
 * @param {string} filePath - Path to the Excel file.
 * @returns {Array<Object>} - Array of objects with standardized keys.
 */
const parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON with row objects
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
    
    if (rows.length === 0) return [];

    // Map rows to standardized keys
    return rows.map(row => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const standardKey = getStandardKey(key);
        if (standardKey) {
          normalizedRow[standardKey] = row[key];
        } else {
          // Keep unmapped keys as they are, but lowercase/trim them
          normalizedRow[key.toLowerCase().trim()] = row[key];
        }
      });
      return normalizedRow;
    });
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

module.exports = parseExcel;
