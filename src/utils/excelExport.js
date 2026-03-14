import ExcelJS from 'exceljs';

const FONT_NAME = 'Times New Roman';
const DOLLAR_FMT = '"$"#,##0.0_);\\("$"#,##0.0\\)';
const PCT_FMT = '0.0%';
const COUNT_FMT = '#,##0_);(#,##0)';

function titleFont() {
  return { name: FONT_NAME, size: 12, bold: true };
}
function subtitleFont() {
  return { name: FONT_NAME, size: 10, italic: true };
}
function sectionFont() {
  return { name: FONT_NAME, size: 12, bold: true };
}
function headerFont() {
  return { name: FONT_NAME, size: 10, bold: true };
}
function dataFont() {
  return { name: FONT_NAME, size: 10 };
}
function italicFont() {
  return { name: FONT_NAME, size: 10, italic: true };
}

const THIN_BOTTOM = { bottom: { style: 'thin' } };
const THIN_TOP_BOTTOM = { top: { style: 'thin' }, bottom: { style: 'thin' } };

function setColWidths(ws, dataColCount) {
  ws.getColumn(1).width = 35;
  for (let i = 2; i <= dataColCount + 1; i++) {
    ws.getColumn(i).width = 14;
  }
}

function hasPercentRaw(values, years) {
  for (const y of years) {
    const v = values[y];
    if (v == null) continue;
    const raw = typeof v === 'object' ? v.value : v;
    if (typeof raw === 'string' && raw.includes('%')) return true;
  }
  return false;
}

function guessFormat(label, val, values, years) {
  if (values && years && hasPercentRaw(values, years)) return PCT_FMT;
  return DOLLAR_FMT;
}

function parseNum(v) {
  if (v == null) return null;
  const raw = typeof v === 'object' ? v.value : v;
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || s === '—' || s === '-' || s === '–') return null;
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/[$€£¥₹,\s]/g, '');
  const n = Number(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

function addTitleRow(ws, rowNum, title) {
  const row = ws.getRow(rowNum);
  row.getCell(1).value = title;
  row.getCell(1).font = titleFont();
  row.getCell(1).border = THIN_BOTTOM;
  return rowNum + 1;
}

function addSubtitleRow(ws, rowNum, text) {
  const row = ws.getRow(rowNum);
  row.getCell(1).value = text;
  row.getCell(1).font = subtitleFont();
  return rowNum + 1;
}

function addYearHeaderRow(ws, rowNum, years) {
  const row = ws.getRow(rowNum);
  row.getCell(1).value = '($ in millions)';
  row.getCell(1).font = subtitleFont();
  years.forEach((y, i) => {
    const cell = row.getCell(i + 2);
    cell.value = typeof y === 'number' ? y : String(y);
    cell.font = headerFont();
    cell.border = THIN_TOP_BOTTOM;
    cell.alignment = { horizontal: 'center' };
  });
  return rowNum + 1;
}

function addSectionHeader(ws, rowNum, text) {
  const row = ws.getRow(rowNum);
  row.getCell(1).value = text;
  row.getCell(1).font = sectionFont();
  return rowNum + 1;
}

function addDataRow(ws, rowNum, label, values, years) {
  const row = ws.getRow(rowNum);
  const isItalic = label && (label.startsWith('    ') || label.startsWith('     '));
  const font = isItalic ? italicFont() : dataFont();
  row.getCell(1).value = label || '';
  row.getCell(1).font = font;

  const firstVal = years.map((y) => parseNum(values[y])).find((v) => v != null);
  const fmt = guessFormat(label, firstVal, values, years);

  years.forEach((y, i) => {
    const cell = row.getCell(i + 2);
    const num = parseNum(values[y]);
    if (num != null) {
      cell.value = fmt === PCT_FMT ? num : num;
      cell.numFmt = fmt;
    } else {
      cell.value = '';
    }
    cell.font = font;
    cell.alignment = { horizontal: 'right' };
  });
  return rowNum + 1;
}

async function downloadWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportEdgarToExcel(data, ticker) {
  const wb = new ExcelJS.Workbook();
  const merged = data?.merged;
  if (!merged) return;

  const years = merged.years || [];
  const statements = [
    { key: 'income_statement', label: 'Income Statement' },
    { key: 'balance_sheet', label: 'Balance Sheet' },
    { key: 'cash_flow_statement', label: 'Cash Flow Statement' },
  ];

  const ws = wb.addWorksheet('Financial Statements');
  setColWidths(ws, years.length);

  let row = 1;
  row = addTitleRow(ws, row, `${(ticker || 'COMPANY').toUpperCase()} — Financial Statements`);
  row++;

  for (const stmt of statements) {
    const stmtData = merged[stmt.key];
    if (!stmtData || typeof stmtData !== 'object') continue;

    row = addYearHeaderRow(ws, row, years);
    row = addSectionHeader(ws, row, stmt.label);

    const items = Object.entries(stmtData);
    let lastSection = '';
    for (const [, item] of items) {
      const section = item.section_label || '';
      if (section && section !== lastSection) {
        const sRow = ws.getRow(row);
        sRow.getCell(1).value = section;
        sRow.getCell(1).font = headerFont();
        row++;
        lastSection = section;
      }
      row = addDataRow(ws, row, item.item_label || '', item.values || {}, years);
    }
    row++; // blank row between statements
  }

  await downloadWorkbook(wb, `${ticker || 'edgar'}_financials.xlsx`);
}

export async function exportExtractedTablesToExcel(tables, fileId) {
  const wb = new ExcelJS.Workbook();
  if (!tables || tables.length === 0) return;

  let sheetIndex = 0;
  tables.forEach((table, tIdx) => {
    const { data, table_metadata } = table;
    if (!data) return;

    const subTables = data.tables || [];

    // LLM extraction format: data.tables[] with headers + 2D rows
    if (subTables.length > 0) {
      for (const st of subTables) {
        sheetIndex++;
        const title = st.title || table_metadata?.table_title || `Table ${sheetIndex}`;
        const sheetName = `${sheetIndex}_${title}`.substring(0, 31).replace(/[*?:/\\[\]]/g, '_');
        const headers = st.headers || [];
        const rows = st.rows || [];

        const ws = wb.addWorksheet(sheetName);
        setColWidths(ws, headers.length);

        let rowNum = 1;
        rowNum = addTitleRow(ws, rowNum, title);
        rowNum++;

        // Header row
        if (headers.length > 0) {
          const hRow = ws.getRow(rowNum);
          headers.forEach((h, i) => {
            const cell = hRow.getCell(i + 1);
            cell.value = h;
            cell.font = headerFont();
            cell.border = THIN_TOP_BOTTOM;
            cell.alignment = { horizontal: i === 0 ? 'left' : 'center' };
          });
          rowNum++;
        }

        // Data rows (2D array)
        for (const row of rows) {
          const cells = Array.isArray(row) ? row : [];
          const wsRow = ws.getRow(rowNum);
          cells.forEach((val, i) => {
            const cell = wsRow.getCell(i + 1);
            const num = val != null ? Number(val) : NaN;
            if (!isNaN(num) && val !== '' && val !== null) {
              cell.value = num;
              cell.numFmt = DOLLAR_FMT;
              cell.alignment = { horizontal: 'right' };
            } else {
              cell.value = val != null ? String(val) : '';
            }
            cell.font = dataFont();
          });
          rowNum++;
        }
      }
      return;
    }

    // Legacy format: data.rows with data.periods
    const rows = data.rows || [];
    const periods = data.periods || [];
    const periodKeys = periods.map((p) => p.year || p.period || String(p));
    sheetIndex++;
    const title = table_metadata?.table_title || `Table ${sheetIndex}`;
    const sheetName = `${sheetIndex}_${title}`.substring(0, 31).replace(/[*?:/\\[\]]/g, '_');

    const ws = wb.addWorksheet(sheetName);
    setColWidths(ws, periodKeys.length);

    let rowNum = 1;
    rowNum = addTitleRow(ws, rowNum, title);
    rowNum++;
    rowNum = addYearHeaderRow(ws, rowNum, periodKeys);

    for (const row of rows) {
      rowNum = addDataRow(ws, rowNum, row.label || '', row.values || {}, periodKeys);
    }
  });

  await downloadWorkbook(wb, `extracted_tables_${fileId || 'data'}.xlsx`);
}
