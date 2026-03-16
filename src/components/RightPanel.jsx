import { forwardRef } from 'react';
import EdgarTables from './EdgarTables';
import ExtractorTables from './ExtractorTables';

function RightPanel(
  {
    loading,
    currentRoute,
    fileId,
    filename,
    chatbotReady,
    chatbotProcessing,
    workspaceItems = [],
    activeWorkspaceId,
    onSelectWorkspace,
    onCloseWorkspaceItem,
    workspacePanelWidth,
    activeTabLabel,
  },
  ref
) {
  const activeItem = workspaceItems.find((w) => w.id === activeWorkspaceId) || null;
  const hasItems = workspaceItems.length > 0;

  return (
    <aside
      ref={ref}
      className={`right-panel ${hasItems ? 'right-panel-workspace' : ''}`}
      style={workspacePanelWidth ? { width: `${workspacePanelWidth}px` } : undefined}
    >
      <div className="right-panel-header">
        <span className="right-panel-title">Workspace</span>
      </div>
      <div className="right-panel-content">
        <div className="right-panel-context-bar">
          <span
            className={`right-panel-status ${
              loading ? 'right-panel-status-running' : 'right-panel-status-idle'
            }`}
          >
            <span className="right-panel-status-dot" />
            <span>{loading ? 'Processing…' : currentRoute || 'Idle'}</span>
          </span>
          <span className="right-panel-doc-inline">No active document</span>
        </div>

        {hasItems && (
          <div className="workspace-tabs">
            {workspaceItems.map((item) => (
              <div
                key={item.id}
                className={`workspace-tab ${item.id === activeWorkspaceId ? 'workspace-tab-active' : ''}`}
                role="tab"
                aria-selected={item.id === activeWorkspaceId}
                onClick={() => onSelectWorkspace?.(item.id)}
              >
                <span className="workspace-tab-label" title={item.title}>
                  {item.title || item.type}
                </span>
                <button
                  type="button"
                  className="workspace-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWorkspaceItem?.(item.id);
                  }}
                  aria-label="Close tab"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="workspace-detail">
          <div className="workspace-detail-inner workspace-detail-tables">
            {activeItem?.type === 'edgar' && (
              <EdgarTables data={activeItem.data} ticker={activeItem.ticker} />
            )}
            {activeItem?.type === 'extractor' && (
              <ExtractorTables
                extractedTables={activeItem.extractedTables}
                fileId={activeItem.fileId}
              />
            )}
            {!activeItem && !hasItems && (
              <p className="workspace-empty">
                Results will appear here when you run a query or extraction.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default forwardRef(RightPanel);
