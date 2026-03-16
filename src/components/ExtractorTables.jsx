import { useState, useEffect } from 'react';
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

function PdfPreview({ fileId, pageIndex }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileId || pageIndex == null) { setLoading(false); return; }
    let revoked = false;
    (async () => {
      try {
        const blob = await api.getPagePreview(fileId, pageIndex);
        if (!revoked && blob && blob.size > 0) {
          setPreviewUrl(URL.createObjectURL(blob));
        }
      } catch {
        // preview unavailable
      } finally {
        if (!revoked) setLoading(false);
      }
    })();
    return () => { revoked = true; };
  }, [fileId, pageIndex]);

  if (!previewUrl && !loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          style={{
            padding: '3px 10px', fontSize: '12px', cursor: 'pointer',
            background: 'var(--surface-hover)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
          }}
        >
          {hidden ? 'Show preview' : 'Hide preview'}
        </button>
        {!hidden && (
          <>
            <button
              type="button" onClick={() => setZoom((z) => Math.max(25, z - 25))}
              style={{
                padding: '3px 8px', fontSize: '12px', cursor: 'pointer',
                background: 'var(--surface-hover)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              }}
            >−</button>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', minWidth: '36px', textAlign: 'center' }}>{zoom}%</span>
            <button
              type="button" onClick={() => setZoom((z) => Math.min(300, z + 25))}
              style={{
                padding: '3px 8px', fontSize: '12px', cursor: 'pointer',
                background: 'var(--surface-hover)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              }}
            >+</button>
            <button
              type="button" onClick={() => setZoom(100)}
              style={{
                padding: '3px 10px', fontSize: '12px', cursor: 'pointer',
                background: 'var(--surface-hover)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              }}
            >Reset</button>
          </>
        )}
      </div>
      {!hidden && (
        <div style={{
          overflow: 'auto', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)',
          maxHeight: '600px',
        }}>
          {loading ? (
            <p style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading preview…</p>
          ) : (
            <img
              src={previewUrl}
              alt={`Page ${pageIndex + 1} preview`}
              style={{ display: 'block', width: `${zoom}%`, height: 'auto' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SingleTable({ table, index, fileId }) {
  const { data, table_metadata } = table;
  if (!data) return null;

  const subTables = data.tables || [];
  const legacyRows = data.rows || [];

  if (subTables.length === 0 && legacyRows.length === 0) return null;

  const pageIndex = table.page_index ?? (table.page_number ? table.page_number - 1 : null);
  const pageLabel = `Page ${table.page_number || (pageIndex != null ? pageIndex + 1 : '?')}`;

  const tableContent = subTables.length > 0 ? (
    <>
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
    </>
  ) : (
    (() => {
      const periods = data.periods || [];
      const periodKeys = periods.map((p) => p.year || p.period || String(p));
      const title = table_metadata?.table_title || `Table ${index + 1}`;
      return (
        <>
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
        </>
      );
    })()
  );

  return (
    <div className="extract-table-wrap" style={{ display: 'flex', gap: '16px' }}>
      <div style={{ flex: '3 1 0%', minWidth: 0 }}>
        {tableContent}
      </div>
      {fileId && pageIndex != null && (
        <div style={{ flex: '2 1 0%', minWidth: 0 }}>
          <PdfPreview fileId={fileId} pageIndex={pageIndex} />
        </div>
      )}
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
