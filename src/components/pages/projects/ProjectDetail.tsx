import type { Project } from "./types";

type ProjectDetailProps = {
  project: Project;
  onOpenEditor: (modelPath?: string) => void;
};

export default function ProjectDetail({ project, onOpenEditor }: ProjectDetailProps) {
  const parseItem = (item: string) => {
    if (!item.trim()) {
      return null;
    }
    if (item.includes(":")) {
      const [label, ...rest] = item.split(":");
      const value = rest.join(":").trim();
      return value ? { label: label.trim(), value } : { label: "", value: label.trim() };
    }
    const [label, ...rest] = item.split(" ");
    const value = rest.join(" ").trim();
    return value ? { label: label.trim(), value } : { label: "", value: label.trim() };
  };

  const detailItems = [...project.details.itemsA, ...project.details.itemsB]
    .map(parseItem)
    .filter((item): item is { label: string; value: string } => Boolean(item));

  const detailMap = new Map(detailItems.map((item) => [item.label, item.value]));
  const productName = detailMap.get("제품명") ?? project.name;
  const modelName = detailMap.get("모델명");

  const metrics = [
    { label: "용량", value: detailMap.get("용량") },
    { label: "메쉬", value: detailMap.get("메쉬") },
    { label: "폴리곤", value: detailMap.get("폴리곤") },
    { label: "등록일자", value: detailMap.get("등록일자") },
  ];

  return (
    <div className="project-detail">
      <div className="detail-header">
        <div>
          <div className="detail-title">{productName}</div>
          {modelName && <div className="detail-subtitle">모델명 {modelName}</div>}
        </div>
        <div className="detail-actions">
          <button
            className="btn primary"
            onClick={(event) => {
              event.stopPropagation();
              onOpenEditor(project.modelPath);
            }}
          >
            Editor
          </button>
          <button className="btn">Download</button>
        </div>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">{metric.value ?? "-"}</div>
          </div>
        ))}
      </div>

      <div className="kv-grid">
        {detailItems.map((item) => (
          <div className="kv-row" key={`${item.label}-${item.value}`}>
            {item.label && <span className="kv-label">{item.label}</span>}
            <span className="kv-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
