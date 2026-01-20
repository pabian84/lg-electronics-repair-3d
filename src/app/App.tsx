import { useState } from "react";
import "./App.css";
import Projects from "@/pages/Projects";
import AnimationLibraryPage from "@/pages/AnimationLibraryPage";
import ManualEditorPage from "@/pages/ManualEditorPage";

const tabs = [
  // { id: "projects", label: "Project Manager" },
  // { id: "animation", label: "3D Animation Manager" },
] as const;

type TabId = (typeof tabs)[number]["id"] | "editor";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("projects");
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  const [editorSessionId, setEditorSessionId] = useState(0);
  const isEditor = activeTab === "editor";
  const hasTabs = tabs.length > 0;

  const topbar = (
    <header className="topbar">
      <div className="topbar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );

  return (
    <div className="app">
      {isEditor ? (
        <div className="editor-shell">
          <div className="main">
            <ManualEditorPage
              key={`editor-${editorSessionId}`}
              modelPath={selectedModelPath ?? undefined}
              onBack={() => {
                setEditorSessionId((prev) => prev + 1);
                setActiveTab("projects");
              }}
            />
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-title">LG 3D Manual Studio</div>
            <button
              className={`sidebar-item ${activeTab === "projects" ? "active" : ""}`}
              onClick={() => setActiveTab("projects")}
            >
              Projects
            </button>
            <button
              className={`sidebar-item ${activeTab === "animation" ? "active" : ""}`}
              onClick={() => setActiveTab("animation")}
            >
              Animation Manager
            </button>
          </aside>

          <div className="main">
            {hasTabs && topbar}
            {activeTab === "projects" && (
              <Projects
                onOpenEditor={(modelPath) => {
                  setSelectedModelPath(modelPath ?? null);
                  setActiveTab("editor");
                }}
              />
            )}
            {activeTab === "animation" && (
              <AnimationLibraryPage modelPath={selectedModelPath ?? undefined} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
