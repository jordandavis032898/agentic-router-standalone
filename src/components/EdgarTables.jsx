import { useState } from 'react';
import { exportEdgarToExcel } from '../utils/excelExport';

const STATEMENT_KEYS = [
  { key: 'income_statement', label: 'Income Statement' },
  { key: 'balance_sheet', label: 'Balance Sheet' },
  { key: 'cash_flow_statement', label: 'Cash Flow Statement' },
];

function formatValue(val) {
  if (val == null) return '—';
  const v = typeof val === 'object' ? val.value : val;
  if (v == null) return '—';
  const num = Number(v);
  if (isNaN(num)) return String(v);
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

function StatementTable({ title, statement, years }) {
  if (!statement || typeof statement !== 'object') return null;

  const items = Object.entries(statement).map(([key, item]) => ({
    key,
    section: item.section_label || '',
    label: item.item_label || key,
    values: item.values || {},
  }));

  if (items.length === 0) return null;

  return (
    <div className="edgar-statement-wrap">
      <div className="edgar-statement-header">
        <span className="edgar-statement-title">{title}</span>
      </div>
      <div className="edgar-table-scroll">
        <table className="edgar-table">
          <thead>
            <tr>
              <th className="edgar-th">Line Item</th>
              {years.map((y) => (
                <th key={y} className="edgar-th">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td className="edgar-td">
                  {item.section && <span className="edgar-section-label">{item.section}</span>}
                  <span className="edgar-item-with-section">{item.label}</span>
                </td>
                {years.map((y) => (
                  <td key={y} className="edgar-td edgar-td-value">
                    {formatValue(item.values[y])}
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

export default function EdgarTables({ data, ticker }) {
  const [exporting, setExporting] = useState(false);

  if (!data?.merged) {
    return (
      <div className="edgar-tables-container">
        <p className="edgar-tables-empty">No EDGAR data available in this demo view.</p>
      </div>
    );
  }

  const { merged } = data;
  const years = merged.years || [];
  const available = STATEMENT_KEYS.filter((s) => merged[s.key]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEdgarToExcel(data, ticker);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="edgar-tables-container">
      <div className="edgar-tables-toolbar">
        <span className="edgar-tables-title">
          EDGAR — {ticker || 'Financials'} · {years.length} year{years.length !== 1 ? 's' : ''}
        </span>
        <button type="button" className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>
      {available.map((s) => (
        <StatementTable
          key={s.key}
          title={s.label}
          statement={merged[s.key]}
          years={years}
        />
      ))}
    </div>
  );
}
