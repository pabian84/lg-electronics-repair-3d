import type { Object3D } from "three";
import HierarchyPanel from "./HierarchyPanel";
import "./ManualEditorSidebar.css";

type ManualEditorSidebarProps = {
  activeModel: string;
  sceneRoot: Object3D | null;
  selectedNode: Object3D | null;
  onSelectNode: (node: Object3D | null) => void;
  onBack?: () => void;
};

export default function ManualEditorSidebar({
  activeModel,
  sceneRoot,
  selectedNode,
  onSelectNode,
  onBack,
}: ManualEditorSidebarProps) {
  return (
    <div className="manual-editor-sidebar">
      <HierarchyPanel
        activeModel={activeModel}
        sceneRoot={sceneRoot}
        selectedNode={selectedNode}
        onSelectNode={onSelectNode}
        onBack={onBack}
        showSearch={true}
        showList={true}
      />
    </div>
  );
}
