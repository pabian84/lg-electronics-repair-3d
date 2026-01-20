import type { Project } from "./types";
import ProjectDetail from "./ProjectDetail";

type ProjectsTableProps = {
  projects: Project[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onOpenEditor: (modelPath?: string) => void;
};

export default function ProjectsTable({
  projects,
  expandedId,
  onToggle,
  onOpenEditor,
}: ProjectsTableProps) {
  return (
    <div className="table">
      <div className="table-header">
        <div></div>
        <div>Name</div>
        <div>3D File</div>
        <div>XML/HTML File</div>
        <div>BOM File</div>
        <div>Date</div>
        <div></div>
      </div>

      {projects.map((project) => (
        <div key={project.id}>
          <div className="table-row" onClick={() => onToggle(project.id)}>
            <input type="checkbox" onClick={(event) => event.stopPropagation()} />
            <div>{project.name}</div>
            <div>{project.glb}</div>
            <div>{project.guide}</div>
            <div>{project.bom}</div>
            <div>{project.date}</div>
            <div>?</div>
          </div>

          {expandedId === project.id && (
            <ProjectDetail project={project} onOpenEditor={onOpenEditor} />
          )}
        </div>
      ))}
    </div>
  );
}
