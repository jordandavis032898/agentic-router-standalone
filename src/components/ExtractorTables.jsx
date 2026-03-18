import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { exportExtractedTablesToExcel } from '../utils/excelExport';
import * as api from '../api';

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
  // Strip the "Found N table(s):" prefix line
  const cleaned = explanation.replace(/^Found \d+ table\(s\):?\s*/i, '').trim();
  if (!cleaned) return null;

  return (
    <div className="extract-explanation" style={{ marginTop: '12px' }}>
      <div style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.6' }}>
        <ReactMarkdown>{cleaned}</ReactMarkdown>
      </div>
    </div>
  );
}

function PdfPreview({ fileId, pageIndex }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId || pageIndex == null) { setLoading(false); return; }
    let revoked = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const blob = await api.getPagePreview(fileId, pageIndex);
        if (revoked) return;
        if (blob && blob.size > 0) {
          setSrc(URL.createObjectURL(blob));
        } else {
          setError(true);
        }
      } catch {
        if (!revoked) setError(true);
      } finally {
        if (!revoked) setLoading(false);
      }
    })();
    return () => {
      revoked = true;
      setSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [fileId, pageIndex]);

  if (loading) {
    return <div className="extract-preview-placeholder">Loading preview...</div>;
  }
  if (error || !src) {
    return <div className="extract-preview-placeholder">Preview unavailable</div>;
  }
  return <img src={src} alt={`Page ${pageIndex + 1}`} className="extract-preview-img" />;
}

function SingleTable({ table, index, fileId }) {
  const { data, table_metadata } = table;
  if (!data) return null;

  const subTables = data.tables || [];
  const legacyRows = data.rows || [];

  if (subTables.length === 0 && legacyRows.length === 0) return null;

  const pageIndex = table.page_index != null
    ? Number(table.page_index)
    : (table.page_number ? Number(table.page_number) - 1 : null);
  const pageLabel = `Page ${table.page_number || (pageIndex != null ? pageIndex + 1 : '?')}`;

  // Determine the title from the first subtable or metadata
  const headerTitle = subTables.length > 0
    ? (subTables[0].title || table_metadata?.table_title || `Table ${index + 1}`)
    : (table_metadata?.table_title || `Table ${index + 1}`);

  const tableBody = subTables.length > 0 ? (
    <>
      {subTables.map((st, stIdx) => {
        const headers = st.headers || [];
        const rows = st.rows || [];
        return (
          <div key={stIdx} className="extract-subtable">
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
    </>
  ) : (
    (() => {
      const periods = data.periods || [];
      const periodKeys = periods.map((p) => p.year || p.period || String(p));
      return (
        <>
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
          <ExplanationBlock explanation={table.explanation} />
        </>
      );
    })()
  );

  return (
    <div className="extract-table-wrap">
      <div className="extract-table-header">
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{pageLabel}</span>
        <span style={{ fontWeight: 600, fontSize: '15px' }}>{headerTitle}</span>
      </div>
      <div className="extract-split-layout">
        <div className="extract-split-table">
          {tableBody}
        </div>
        {fileId && pageIndex != null && (
          <div className="extract-split-preview">
            <PdfPreview fileId={fileId} pageIndex={pageIndex} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExtractorTables({ extractedTables, fileId }) {
  const tables = extractedTables || [];
  console.log('Extraction results:', JSON.stringify(tables.map(t => ({ page_index: t.page_index, page_number: t.page_number, status: t.extraction_status, title: t.data?.tables?.[0]?.title })), null, 2));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Reset scroll to left on mount so first column is visible
    const el = document.querySelectorAll('.extract-table-scroll');
    el.forEach((e) => { e.scrollLeft = 0; });
  }, []);

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
        <p className="extract-tables-empty">No extracted tables to display.</p>
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
        <SingleTable key={idx} table={table} index={idx} fileId={fileId} />
      ))}
    </div>
  );
}
