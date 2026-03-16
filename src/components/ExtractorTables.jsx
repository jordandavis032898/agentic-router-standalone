import { useState } from 'react';
import { exportExtractedTablesToExcel } from '../utils/excelExport';

function formatCellValue(val) {
  if (val == null) return '—';
  if (typeof val === 'object' && val.value != null) return String(val.value);
  return String(val);
}

function cleanHeader(h) {
  if (typeof h !== 'string') return h;
  return h.replace(/<br\s*\/?>/gi, ' ').trim();
}

function ExplanationBlock({ explanation }) {
  if (!explanation) return null;
  const lines = explanation.split('\n').filter((l) => l.trim());
  const heading = lines[0] || '';
  const bullets = lines.slice(1);

  return (
    <div className="extract-explanation">
      {heading && <p className="extract-explanation-heading">{heading}</p>}
      {bullets.length > 0 && (
        <ul className="extract-explanation-list">
          {bullets.map((b, i) => (
            <li key={i}>{b.replace(/^\s*\d+\.\s*/, '')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SingleTable({ table, index }) {
  // The API returns: { data: { tables: [{ title, headers, rows, summary }] }, table_metadata, ... }
  // Or legacy format: { data: { rows: [...], periods: [...] } }
  const { data, table_metadata } = table;
  if (!data) return null;

  // Handle the LLM extraction format: data.tables[]
  const subTables = data.tables || [];
  // Legacy fallback: data.rows directly
  const legacyRows = data.rows || [];

  if (subTables.length === 0 && legacyRows.length === 0) return null;

  const pageLabel = `Page ${table.page_number || table.page_index + 1}`;

  // If using LLM format (tables array), render each sub-table
  if (subTables.length > 0) {
    return (
      <div className="extract-table-wrap">
        {subTables.map((st, stIdx) => {
          const title = st.title || table_metadata?.table_title || `Table ${index + 1}`;
          const headers = st.headers || [];
          const rows = st.rows || [];
          return (
            <div key={stIdx} className="extract-subtable">
              <div className="extract-table-header">
                <span>{title}</span>
                <span className="extract-table-meta">{pageLabel}</span>
              </div>
              {st.summary && (
                <p className="extract-table-summary">{st.summary}</p>
              )}
              <div className="extract-table-scroll">
                <table className="extract-table">
                  {headers.length > 0 && (
                    <thead>
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="extract-th">{cleanHeader(h)}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {(Array.isArray(row) ? row : []).map((cell, cIdx) => (
                          <td key={cIdx} className="extract-td extract-td-value">
                            {formatCellValue(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        <ExplanationBlock explanation={table.explanation} />
      </div>
    );
  }

  // Legacy format: data.rows with data.periods
  const periods = data.periods || [];
  const periodKeys = periods.map((p) => p.year || p.period || String(p));
  const title = table_metadata?.table_title || `Table ${index + 1}`;

  return (
    <div className="extract-table-wrap">
      <div className="extract-table-header">
        <span>{title}</span>
        <span className="extract-table-meta">{pageLabel}</span>
      </div>
      <div className="extract-table-scroll">
        <table className="extract-table">
          <thead>
            <tr>
              <th className="extract-th">Line Item</th>
              {periodKeys.map((p) => (
                <th key={p} className="extract-th">{cleanHeader(p)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legacyRows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="extract-td">{row.label || `Row ${rIdx + 1}`}</td>
                {periodKeys.map((p) => (
                  <td key={p} className="extract-td extract-td-value">
                    {formatCellValue(row.values?.[p])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExtractorTables({ extractedTables, fileId }) {
  const tables = extractedTables || [];
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportExtractedTablesToExcel(tables, fileId);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  if (tables.length === 0) {
    return (
      <div className="extract-tables-container">
        <p className="extract-tables-empty">No extracted tables to display in this demo.</p>
      </div>
    );
  }

  return (
    <div className="extract-tables-container">
      <div className="extract-tables-toolbar">
        <span className="extract-tables-title">
          Extracted Tables ({tables.length})
        </span>
        <button type="button" className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>
      {tables.map((table, idx) => (
        <SingleTable key={idx} table={table} index={idx} />
      ))}
    </div>
  );
}
