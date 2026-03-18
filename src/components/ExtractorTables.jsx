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

function PdfPreviewPanel({ b64Image, pageNum, show, onToggle }) {
  const [zoom, setZoom] = useState(100);

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
        {b64Image ? (
          <img
            src={`data:image/png;base64,${b64Image}`}
            alt={`Page ${pageNum}`}
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

function SingleTable({ table, index, thumbnails, showPreview, onTogglePreview }) {
  const { data, table_metadata } = table;
  if (!data) return null;

  const subTables = data.tables || [];
  const legacyRows = data.rows || [];

  if (subTables.length === 0 && legacyRows.length === 0) return null;

  const pageIndex = table.page_index != null
    ? Number(table.page_index)
    : (table.page_number ? Number(table.page_number) - 1 : null);
  const pageNum = table.page_number || (pageIndex != null ? pageIndex + 1 : null);
  const pageLabel = `Page ${pageNum || '?'}`;

  const headerTitle = subTables.length > 0
    ? (subTables[0].title || table_metadata?.table_title || `Table ${index + 1}`)
    : (table_metadata?.table_title || `Table ${index + 1}`);

  // Get base64 thumbnail for this page
  const b64Image = pageNum ? thumbnails[pageNum] : null;

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
        {!showPreview && b64Image && (
          <button type="button" className="extract-preview-toggle-btn" onClick={onTogglePreview}>
            Show preview
          </button>
        )}
      </div>
      <div className="extract-split-layout">
        <div className={showPreview && b64Image ? 'extract-split-table' : 'extract-split-table-full'}>
          {tableBody}
        </div>
        <PdfPreviewPanel
          b64Image={b64Image}
          pageNum={pageNum}
          show={showPreview && !!b64Image}
          onToggle={onTogglePreview}
        />
      </div>
    </div>
  );
}

export default function ExtractorTables({ extractedTables, fileId }) {
  const tables = extractedTables || [];
  const [exporting, setExporting] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [showPreviews, setShowPreviews] = useState(true);

  // Fetch all thumbnails once for the PDF preview panels
  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getAllThumbnails(fileId, 600); // higher res for preview
        if (cancelled) return;
        const map = {};
        (res?.thumbnails || []).forEach((t) => {
          map[t.page_number] = t.image;
        });
        setThumbnails(map);
      } catch (e) {
        console.error('Failed to load thumbnails for preview:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [fileId]);

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
          thumbnails={thumbnails}
          showPreview={showPreviews}
          onTogglePreview={() => setShowPreviews((p) => !p)}
        />
      ))}
    </div>
  );
}
