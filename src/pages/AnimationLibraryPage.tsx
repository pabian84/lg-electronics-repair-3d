import "./AnimationLibraryPage.css";

type AnimationLibraryPageProps = {
  modelPath?: string;
};

export default function AnimationLibraryPage({ modelPath }: AnimationLibraryPageProps) {
  return (
    <section className="animation-library">
      <div className="animation-library-header">
        <div className="animation-library-title">Animation Library</div>
        <button className="animation-library-btn">New Action</button>
      </div>

      <div className="animation-library-grid">
        <div className="animation-library-panel">
          <div className="animation-library-list">
            <div className="animation-library-tag">View Action</div>
            <div className="animation-library-tag">Guide Action</div>
            <div className="animation-library-tag">Fastener Action</div>
            <div className="animation-library-tag">Part Action</div>
          </div>
        </div>

        <div className="animation-library-panel animation-panel">
          <div className="viewer-section">
            {/* <div className="animation-library-column-title">Model Preview</div>
            <ModelViewer modelPath={modelPath} /> */}
          </div>

          <div className="animation-library-section-header">
            <div className="animation-library-column-title">View Action / List</div>
            <div className="animation-library-actions">
              <input className="animation-library-search" placeholder="Search" />
              <button className="animation-library-btn">Delete</button>
            </div>
          </div>

          <div className="animation-library-table-header">
            <div></div>
            <div>Name</div>
            <div>Description</div>
            <div></div>
          </div>

          <div className="animation-library-table-row">
            <input type="checkbox" />
            <div>ACT-CAMERA-FOCUS</div>
            <div>카메라 이동</div>
            <div className="animation-library-actions">
              <button className="animation-library-btn">수정</button>
              <button className="animation-library-btn">삭제</button>
            </div>
          </div>

          <div className="animation-library-table-row">
            <input type="checkbox" />
            <div>ACT-CAMERA-ROTATE</div>
            <div>카메라 회전</div>
            <div className="animation-library-actions">
              <button className="animation-library-btn">수정</button>
              <button className="animation-library-btn">삭제</button>
            </div>
          </div>

          <div className="animation-library-table-row">
            <input type="checkbox" />
            <div>ACT-CAMERA-ZOOM</div>
            <div>카메라 줌 인/아웃</div>
            <div className="animation-library-actions">
              <button className="animation-library-btn">수정</button>
              <button className="animation-library-btn">삭제</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
