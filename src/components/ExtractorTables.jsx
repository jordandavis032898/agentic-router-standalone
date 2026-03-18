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

function PdfPreviewPanel({ fileId, pageIndex, show, onToggle }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!show || !fileId || pageIndex == null) return;
    let revoked = false;
    setLoading(true);
    (async () => {
      try {
        const blob = await api.getPagePreview(fileId, pageIndex);
        if (revoked) return;
        if (blob && blob.size > 0) {
          setSrc(URL.createObjectURL(blob));
        }
      } catch {
        // preview not available
      } finally {
        if (!revoked) setLoading(false);
      }
    })();
    return () => {
      revoked = true;
      setSrc((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [show, fileId, pageIndex]);

  if (!show) return null;

  return (
    <div className="extract-split-preview">
      <div className="extract-preview-toolbar">
        <button type="button" onClick={onToggle} className="extract-preview-toggle-btn">
          Hide preview
        </button>
        <div className="extract-preview-zoom-controls">
          <button type="button" onClick={() => setZoom((z) => Math.max(25, z - 25))}>−</button>
          <span className="extract-preview-zoom-label">{zoom}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(300, z + 25))}>+</button>
          <button type="button" onClick={() => setZoom(100)} className="extract-preview-zoom-reset">Reset</button>
        </div>
      </div>
      <div className="extract-preview-scroll">
        {loading ? (
          <div className="extract-preview-placeholder">Loading preview…</div>
        ) : src ? (
          <img
            src={src}
            alt={`Page ${pageIndex + 1}`}
            className="extract-preview-img"
            style={{ width: `${zoom}%` }}
          />
        ) : (
          <div className="extract-preview-placeholder">Preview unavailable</div>
        )}
      </div>
    </div>
  );
}

function SingleTable({ table, index, fileId, showPreview, onTogglePreview }) {
  const { data, table_metadata } = table;
  if (!data) return null;

  const subTables = data.tables || [];
  const legacyRows = data.rows || [];

  if (subTables.length === 0 && legacyRows.length === 0) return null;

  const pageIndex = table.page_index != null
    ? Number(table.page_index)
    : (table.page_number ? Number(table.page_number) - 1 : null);
  const pageLabel = `Page ${pageIndex != null ? pageIndex + 1 : '?'}`;

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
        <span style={{ fontWeight: 600, fontSize: '15px', flex: 1 }}>{headerTitle}</span>
        {!showPreview && (
          <button type="button" className="extract-preview-toggle-btn" onClick={onTogglePreview}>
            Show preview
          </button>
        )}
      </div>
      <div className="extract-split-layout">
        <div className={showPreview ? 'extract-split-table' : 'extract-split-table-full'}>
          {tableBody}
        </div>
        <PdfPreviewPanel
          fileId={fileId}
          pageIndex={pageIndex}
          show={showPreview}
          onToggle={onTogglePreview}
        />
      </div>
    </div>
  );
}

export default function ExtractorTables({ extractedTables, fileId }) {
  const tables = extractedTables || [];
  const [exporting, setExporting] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);

  useEffect(() => {
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="extract-preview-toggle-btn"
            onClick={() => setShowPreviews((p) => !p)}
          >
            {showPreviews ? 'Hide all previews' : 'Show all previews'}
          </button>
          <button type="button" className="btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>
      {tables.map((table, idx) => (
        <SingleTable
          key={idx}
          table={table}
          index={idx}
          fileId={fileId}
          showPreview={showPreviews}
          onTogglePreview={() => setShowPreviews((p) => !p)}
        />
      ))}
    </div>
  );
}
