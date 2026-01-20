import { useMemo, useState } from "react";
import type { Object3D } from "three";
import "./HierarchyPanel.css";

type HierarchyPanelProps = {
  activeModel: string;
  sceneRoot: Object3D | null;
  selectedNode: Object3D | null;
  onSelectNode: (node: Object3D | null) => void;
  onBack?: () => void;
  variant?: "panel" | "overlay";
  showHeader?: boolean;
  showSearch?: boolean;
  showList?: boolean;
};

type HierarchyItem = {
  id: string;
  name: string;
  node: Object3D;
  children: HierarchyItem[];
};

const buildHierarchy = (root: Object3D | null): HierarchyItem[] => {
  if (!root) {
    return [];
  }
  const buildNode = (node: Object3D): HierarchyItem => ({
    id: node.uuid,
    name: node.name || `Node_${node.id}`,
    node,
    children: node.children.map(buildNode),
  });
  return root.children.map(buildNode);
};

export default function HierarchyPanel({
  activeModel,
  sceneRoot,
  selectedNode,
  onSelectNode,
  onBack,
  variant = "panel",
  showHeader = true,
  showSearch = true,
  showList = true,
}: HierarchyPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const hierarchyItems = useMemo(() => buildHierarchy(sceneRoot), [sceneRoot]);
  const rootClassName =
    variant === "overlay"
      ? "editor-section hierarchy-panel hierarchy-overlay"
      : "panel editor-section hierarchy-panel";

  const filteredTree = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return hierarchyItems;
    }

    const filterNode = (item: HierarchyItem): HierarchyItem | null => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const childMatches = item.children
        .map(filterNode)
        .filter((child): child is HierarchyItem => child !== null);
      if (nameMatch || childMatches.length > 0) {
        return { ...item, children: childMatches };
      }
      return null;
    };

    return hierarchyItems
      .map(filterNode)
      .filter((item): item is HierarchyItem => item !== null);
  }, [hierarchyItems, searchTerm]);

  const handleNodeClick = (item: HierarchyItem) => {
    onSelectNode(item.node);
    if (item.children.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    }
  };

  const renderNodes = (items: HierarchyItem[], depth = 0) =>
    items.map((item) => {
      const isExpanded = expandedIds.has(item.id);
      const hasChildren = item.children.length > 0;
      return (
        <div key={item.id}>
          <div
            className={`hierarchy-item ${
              selectedNode?.uuid === item.id ? "selected" : ""
            }`}
            style={{ paddingLeft: `${depth * 12}px` }}
            onClick={() => handleNodeClick(item)}
          >
            {hasChildren && (
              <span
                className={`hierarchy-toggle ${isExpanded ? "expanded" : ""}`}
                aria-hidden="true"
              />
            )}
            <span className="hierarchy-label">{item.name}</span>
          </div>
          {hasChildren && isExpanded && renderNodes(item.children, depth + 1)}
        </div>
      );
    });

  return (
    <div className={rootClassName}>
      {showHeader && (
        <>
          <div className="hierarchy-header">
            <button
              className="back-button"
              type="button"
              onClick={onBack}
              aria-label="Back to projects"
            >
              {"<"}
            </button>
            <div className="column-title">3D Manual Editor</div>
          </div>
          <div className="hierarchy-model-name">{activeModel}</div>
        </>
      )}
      {showSearch && (
        <input
          className="search"
          placeholder="Search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      )}
      {showList && (
        <div className="list-stack hierarchy-list" style={{ marginTop: 12 }}>
          {filteredTree.length === 0 && (
            <div className="hierarchy-empty">No nodes found.</div>
          )}
          {renderNodes(filteredTree)}
        </div>
      )}
    </div>
  );
}
