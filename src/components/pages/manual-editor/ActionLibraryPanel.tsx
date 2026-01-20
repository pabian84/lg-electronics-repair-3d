import "./ActionLibraryPanel.css";

const actions = [
  { id: "a1", name: "Open Door", note: "Standard swing" },
  { id: "a2", name: "Close Door", note: "Return to zero" },
  { id: "a3", name: "Detach Part", note: "Explode view" },
  { id: "a4", name: "Reset View", note: "Camera reset" },
];

export default function ActionLibraryPanel() {
  return (
    <div className="panel editor-section library-panel">
      <div className="editor-section-header">
        <div className="editor-section-title">Action Library</div>
      </div>
      <div className="library-actions-row">
        <button className="library-manage" type="button">
          Manage
        </button>
      </div>
      <div className="editor-section-body">
        {actions.map((action) => (
          <button key={action.id} className="library-item" type="button">
            <span className="library-name">{action.name}</span>
            <span className="library-note">{action.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
