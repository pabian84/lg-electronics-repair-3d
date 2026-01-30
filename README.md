# LG Electronics 3D Repair Manual Studio

LG 전자 제품의 3D 조립/분해 매뉴얼을 생성하고 관리하는 웹 애플리케이션입니다. 사용자는 AI 채팅 인터페이스를 통해 자연어로 명령을 입력하면 3D 모델의 부품을 조작하고 애니메이션을 생성할 수 있습니다.

## 프로젝트 개요

- **기술 스택**: React + TypeScript + Vite
- **3D 렌더링**: React Three Fiber (@react-three/fiber) + Three.js
- **3D 유틸리티**: @react-three/drei
- **AI 통신**: Ollama (Phi3 모델)
- **애니메이션**: Three.js AnimationMixer + GSAP

## 전체 폴더 구조

```
lg-electronics-repair-3d/
├─ .agent/                          # AI 에이전트 설정
├─ .kilocode/                       # Kilocode 규칙 및 설정
├─ .windsurf/                       # Windsurf IDE 설정
├─ docs/                            # 프로젝트 문서
│  └─ DAMPER_ASSEMBLY_GUIDE.md     # 댐퍼 조립 가이드
├─ examples/                        # 예제 코드
│  ├─ damper-assembly-example.ts   # 댐퍼 조립 예제
│  ├─ hole-detection-example.ts    # 구멍 탐지 예제
│  ├─ model-viewer-integration.ts  # 모델 뷰어 통합 예제
│  └─ README-hole-detection.md     # 구멍 탐지 README
├─ plans/                           # 기획 및 설계 문서
│  ├─ assembly-method-recommendation.md  # 조립 방식 추천
│  ├─ damper-assembly-analysis.md        # 댐퍼 조립 분석
│  ├─ damper-assembly-animation-architecture.md # 댐퍼 애니메이션 아키텍처
│  ├─ damper-cover-assembly-analysis.md  # 댐퍼 커버 조립 분석
│  ├─ damper-cover-assembly-plan.md      # 댐퍼 커버 조립 계획
│  ├─ groove-center-detection-plan.md    # 그루브 중심 탐지 계획
│  ├─ slot-insertion-assembly-plan.md    # 슬롯 삽입 조립 계획
│  └─ virtual-pivot-assembly-plan.md     # 가상 피벗 조립 계획
├─ public/                          # 정적 리소스 폴더
│  ├─ metadata/                     # 메타데이터
│  │  └─ assembly-offsets.json     # 조립 오프셋 설정
│  └─ models/                      # 3D 모델 파일 (GLB 포맷)
│     └─ M-Next3.glb              # 기본 냉장고 모델
├─ src/                            # 소스 코드 폴더
│  ├─ app/                         # 애플리케이션 엔트리
│  │  ├─ App.tsx                  # 메인 애플리케이션 컴포넌트
│  │  ├─ App.css                  # 앱 전역 스타일
│  │  └─ main.tsx                 # React 렌더링 엔트리
│  ├─ pages/                       # 페이지 컴포넌트
│  │  ├─ ManualEditorPage.tsx     # 3D 매뉴얼 에디터 페이지
│  │  ├─ AnimationLibraryPage.tsx # 애니메이션 라이브러리 페이지
│  │  └─ Projects.tsx             # 프로젝트 관리 페이지
│  ├─ components/                 # 재사용 가능한 컴포넌트
│  │  ├─ pages/                   # 페이지 전용 하위 컴포넌트
│  │  │  ├─ manual-editor/        # 매뉴얼 에디터 관련 컴포넌트
│  │  │  │  ├─ ActionLibraryPanel.tsx    # 액션 라이브러리 패널
│  │  │  │  ├─ AnimationHistoryPanel.tsx # 애니메이션 히스토리 패널
│  │  │  │  ├─ HierarchyPanel.tsx        # 노드 계층 패널
│  │  │  │  ├─ ManualEditorSidebar.tsx   # 에디터 사이드바
│  │  │  │  ├─ ActionLibraryPanel.css
│  │  │  │  ├─ AnimationHistoryPanel.css
│  │  │  │  ├─ HierarchyPanel.css
│  │  │  │  ├─ ManualEditorSidebar.css
│  │  │  │  └─ index.ts           # 컴포넱트 인덱스
│  │  │  └─ projects/             # 프로젝트 관리 관련 컴포넌트
│  │  │     ├─ ProjectsFrame.tsx  # 프로젝트 프레임
│  │  │     ├─ ProjectsHeader.tsx # 프로젝트 헤더
│  │  │     ├─ ProjectsTable.tsx  # 프로젝트 테이블
│  │  │     ├─ ProjectDetail.tsx  # 프로젝트 상세
│  │  │     ├─ types.ts           # 타입 정의
│  │  │     └─ index.ts
│  │  └─ shared/                  # 공용 컴포넌트
│  │     ├─ common/               # 범용 UI 컴포넌트
│  │     │  └─ index.ts
│  │     └─ viewer/               # 3D 모델 뷰어
│  │        ├─ ModelViewer.tsx    # 3D 모델 렌더링 컴포넌트
│  │        ├─ NodeHierarchy.tsx  # 노드 계층 구조 컴포넌트
│  │        ├─ ModelViewer.css
│  │        └─ index.ts
│  ├─ services/                   # 서비스 로직
│  │  ├─ AnimatorAgent.ts         # AI 애니메이터 에이전트
│  │  ├─ AnimationHistoryService.ts # 애니메이션 히스토리 서비스
│  │  └─ fridge/                  # 냉장고 특화 서비스
│  │     ├─ CameraMovementService.ts  # 카메라 이동 서비스
│  │     ├─ DamperAnimationService.ts # 댐퍼 애니메이션 서비스
│  │     ├─ DamperAssemblyService.ts  # 댐퍼 조립 서비스
│  │     ├─ ManualAssemblyManager.ts  # 수동 조립 관리자
│  │     └─ PartAssemblyService.ts    # 부품 조립 서비스
│  ├─ shared/                     # UI가 아닌 공용 코드
│  │  ├─ types/                   # 타입 정의
│  │  │  └─ three-examples.d.ts   # Three.js 확장 타입
│  │  └─ utils/                   # 유틸리티 함수
│  │     ├─ animationUtils.ts          # 애니메이션 유틸리티
│  │     ├─ ClickPointMarker.ts        # 클릭 지점 마커
│  │     ├─ commonUtils.ts             # 일반적인 유틸리티 함수
│  │     ├─ CoordinateTransformUtils.ts # 좌표 변환 유틸리티
│  │     ├─ fridgeConstants.ts         # 냉장고 상수 정의
│  │     ├─ findNodeHeight.ts          # 3D 모델 노드의 높이 계산
│  │     ├─ GrooveDetectionUtils.ts    # 그루브/홈 탐지 유틸리티
│  │     ├─ highlightTreeNode.ts       # 트리 노드 하이라이트
│  │     ├─ MetadataLoader.ts          # 메타데이터 로더
│  │     ├─ NormalBasedHighlight.ts    # 노멀 기반 하이라이트
│  │     ├─ removeClickedNode.ts       # 클릭한 노드 제거
│  │     ├─ selectedNodeHeight.ts      # 선택된 노드 높이 계산
│  │     ├─ SnapDetectionUtils.ts      # 스냅 탐지 유틸리티
│  │     └─ StencilOutlineHighlight.ts # 스텐실 아웃라인 하이라이트
│  └─ styles/                     # 전역 스타일
│     └─ index.css                # 전역 CSS
├─ package.json                   # 프로젝트 의존성
├─ tsconfig.json                  # TypeScript 설정
├─ tsconfig.app.json              # Vite 앱 TypeScript 설정
├─ tsconfig.node.json             # Node TypeScript 설정
├─ vite.config.ts                 # Vite 설정
├─ CONVENTION.md                  # 개발 컨벤션
└─ index.html                     # HTML 엔트리

```

## 폴더 역할 상세 설명

### 1. public/
- **models/**: 3D 모델 파일 (GLB 포맷)
  - `M-Next3.glb`: 기본으로 로드되는 냉장고 3D 모델
- **metadata/**: 메타데이터 설정
  - `assembly-offsets.json`: 조립 오프셋 설정 파일

### 2. src/app/
애플리케이션의 전체 구조와 라우팅을 관리합니다.
- **App.tsx**: 메인 애플리케이션 컴포넌트, 페이지 전환 및 상태 관리
- **App.css**: 앱 전역 스타일
- **main.tsx**: React 애플리케이션의 진입점

### 3. src/pages/
각 페이지에 해당하는 컴포넌트를 포함합니다.
- **ManualEditorPage.tsx**: 3D 매뉴얼 에디터 페이지
  - AI 채팅 인터페이스로 애니메이션 생성
  - 타임라인으로 애니메이션 관리
  - GLB 파일로 애니메이션 내보내기
- **AnimationLibraryPage.tsx**: 애니메이션 라이브러리 페이지
- **Projects.tsx**: 프로젝트 관리 페이지

### 4. src/components/
재사용 가능한 React 컴포넌트를 관리합니다.

#### 4.1 pages/
각 페이지 전용으로 사용되는 하위 컴포넌트
- **manual-editor/**: 매뉴얼 에디터 페이지 컴포넌트
  - `ActionLibraryPanel.tsx`: 액션 라이브러리 패널 (사전 정의된 애니메이션 목록)
  - `AnimationHistoryPanel.tsx`: 애니메이션 히스토리 패널 (생성된 애니메이션 관리)
  - `HierarchyPanel.tsx`: 노드 계층 패널 (3D 모델의 구조 표시)
  - `ManualEditorSidebar.tsx`: 에디터 사이드바 (파일 메뉴, 속성 관리)
  - 각 컴포넌트별 CSS 스타일 파일 포함
  - `index.ts`: 컴포넱트 인덱스 파일
- **projects/**: 프로젝트 관리 페이지 컴포넌트
  - `ProjectsFrame.tsx`: 프로젝트 프레임 (전체 레이아웃)
  - `ProjectsHeader.tsx`: 프로젝트 헤더 (타이틀, 액션 버튼)
  - `ProjectsTable.tsx`: 프로젝트 테이블 (목록 표시)
  - `ProjectDetail.tsx`: 프로젝트 상세 정보
  - `types.ts`: 프로젝트 관련 타입 정의

#### 4.2 shared/
여러 페이지에서 공용으로 사용되는 컴포넌트
- **common/**: 범용 UI 컴포넌트 (버튼, 입력 필드 등)
- **viewer/**: 3D 모델 뷰어 관련 컴포넌트
  - `ModelViewer.tsx`: 3D 모델 렌더링 컴포넌트
  - `NodeHierarchy.tsx`: 3D 모델의 노드 계층 구조 컴포넌트

### 5. src/services/
API 호출, AI 통신, 비즈니스 로직을 처리합니다.
- **AnimatorAgent.ts**: AI 애니메이터 에이전트
  - Ollama API로 AI와 통신
  - 자연어 명령을 파싱하여 애니메이션 생성
  - 대화 상태 관리
- **AnimationHistoryService.ts**: 애니메이션 히스토리 서비스
  - 애니메이션 히스토리 저장/불러기
  - 실행 취소/다시 실행 기능
- **fridge/**: 냉장고 특화 서비스
  - `CameraMovementService.ts`: 카메라 이동 서비스
    - 시네마틱 카메라 워킹 구현
    - Bezier 곡선 기반 부드러운 카메라 이동
    - 대상 물체에 맞춰 동적 시점 계산
  - `DamperAnimationService.ts`: 댐퍼 애니메이션 서비스
  - `DamperAssemblyService.ts`: 댐퍼 조립 서비스
    - 홈(Hole)/그루브 영역 파악
    - 돌출부(Protrusion) 삽입 로직
    - Bounding Box 기반 정렬
  - `ManualAssemblyManager.ts`: 수동 조립 관리자
    - 사용자의 마우스 인터랙션 처리
    - 부품 드래그 앤 드롭 지원
  - `PartAssemblyService.ts`: 부품 조립 서비스
    - 일반 부품 조작 및 애니메이션

### 6. src/shared/
UI 컴포넌트가 아닌 공용 코드
- **types/**: TypeScript 타입 정의
  - `three-examples.d.ts`: Three.js 확장 타입 정의
- **utils/**: 유틸리티 함수
  - `animationUtils.ts`: 애니메이션 관련 유틸리티
  - `ClickPointMarker.ts`: 클릭 지점 마커 표시
  - `commonUtils.ts`: 일반적인 유틸리티 함수
    - `getPreciseBoundingBox()`: 정확한 바운딩 박스 계산
  - `CoordinateTransformUtils.ts`: 좌표 변환 유틸리티
  - `fridgeConstants.ts`: 냉장고 모델 상수 정의
  - `findNodeHeight.ts`: 3D 모델 노드의 높이 계산
  - `GrooveDetectionUtils.ts`: 그루브/홈 탐지 유틸리티
    - Normal 기반 그루브 탐지
    - 곡률 기반 돌출부 패턴 인식
  - `highlightTreeNode.ts`: 트리 노드 하이라이트 처리
  - `MetadataLoader.ts`: 메타데이터 로더
  - `NormalBasedHighlight.ts`: 노멀 기반 하이라이트
  - `removeClickedNode.ts`: 클릭한 노드 제거 유틸리티
  - `selectedNodeHeight.ts`: 선택된 노드 높이 계산
  - `SnapDetectionUtils.ts`: 스냅 탐지 유틸리티
  - `StencilOutlineHighlight.ts`: 스텐실 아웃라인 하이라이트

### 7. src/styles/
전역 스타일과 CSS 변수를 관리합니다.
- **index.css**: 전역 CSS 스타일 및 CSS 변수

## 주요 기능

### 1. 3D 모델 뷰어
- GLB 포맷의 3D 모델 로드 및 렌더링
- OrbitControls로 카메라 조작 (회전, 줌, 패닝)
- 모델의 노드 계층 구조 표시
- 스텐실 아웃라인 하이라이트

### 2. AI 채팅 인터페이스
- 자연어로 명령 입력 (예: "상단 왼쪽 문을 90도 열어")
- Ollama AI 모델로 명령 파싱
- 대화 상태 관리 (문맥 기반 응답)

### 3. 애니메이션 생성
- 문 열기/닫기 애니메이션
- 댐퍼 서비스 애니메이션 (동시에 두 개의 문 열기)
- 애니메이션 속도 및 각도 제어
- GSAP를 활용한 복잡한 이징 효과

### 4. 애니메이션 관리
- 타임라인으로 애니메이션 순서 관리
- 애니메이션 히스토리 저장 및 재사용
- GLB 파일로 애니메이션 내보내기

### 5. 프로젝트 관리
- 프로젝트 생성, 수정, 삭제
- 3D 모델 파일 관리
- 애니메이션 라이브러리 관리

### 6. 홈/그루브 탐지 및 돌출부 삽입
- Normal 기반 그루브 탐지
- Bounding Box 기반 정렬
- Metadata + Virtual Pivot 방식 지원
- 곡률 기반 돌출부 패턴 인식

### 7. 시네마틱 카메라 워킹
- Bezier 곡선 기반 부드러운 카메라 이동
- 대상 물체에 맞춰 동적 시점 계산
- GSAP를 활용한 복잡한 이징 효과

## 8. 프로젝트 문서

### docs/
- **DAMPER_ASSEMBLY_GUIDE.md**: 댐퍼 조립 가이드 문서
  - 댐퍼 커버 분해 절차
  - 조립 시 주의사항
  - 트러블슈팅

### plans/
- **assembly-method-recommendation.md**: 조립 방식 추천 문서
  - Bounding Box & Offset 기반 방식
  - 더미 노드(Pivot/Socket) 활용 방식
  - OBB 기반 충돌 체크
- **damper-assembly-analysis.md**: 댐퍼 조립 분석
- **damper-assembly-animation-architecture.md**: 댐퍼 애니메이션 아키텍처
- **damper-cover-assembly-analysis.md**: 댐퍼 커버 조립 분석
- **damper-cover-assembly-plan.md**: 댐퍼 커버 조립 계획
- **groove-center-detection-plan.md**: 그루브 중심 탐지 계획
- **slot-insertion-assembly-plan.md**: 슬롯 삽입 조립 계획
- **virtual-pivot-assembly-plan.md**: 가상 피벗 조립 계획

### examples/
- **damper-assembly-example.ts**: 댐퍼 조립 예제 코드
- **hole-detection-example.ts**: 구멍 탐지 예제 코드
- **model-viewer-integration.ts**: 모델 뷰어 통합 예제
- **README-hole-detection.md**: 구멍 탐지 예제 README

## 개발 컨벤션

- **Commit Convention**: Conventional Commits 사용
- **Import 규칙**: 페이지 컴포넌트는 `src/components/pages/<page>/index.ts`를 통해 가져옴
- **공용 컴포넌트**: `src/components/shared/<domain>/index.ts`를 통해 가져옴

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 시작
```bash
npm run dev
```
서버는 http://localhost:3000에서 실행됩니다.

### 3. Ollama 서비스 실행
AI 기능을 사용하려면 Ollama 서비스가 실행 중이어야 합니다.
```bash
ollama serve
```

### 4. 빌드
```bash
npm run build
```

## 기술 특징

- **React Three Fiber**: Three.js를 React에서 선언적으로 사용
- **SkeletonUtils**: 3D 모델 클로닝
- **AnimationMixer**: Three.js의 애니메이션 시스템
- **GLTFExporter**: 3D 모델과 애니메이션을 GLB 파일로 내보내기
- **Ollama**: 로컬에서 실행되는 AI 모델
- **GSAP**: 복잡한 이징 효과 및 타임라인 제어
- **Normal-Based Detection**: 노멀 벡터 기반 표면 특성 분석
- **Bounding Box Optimization**: 정확한 월드 좌표 기반 바운딩 박스 계산

## 확장 가능성

- 새로운 제품 모델 추가
- 더 많은 애니메이션 타입 지원
- AI 모델 업그레이드 (Phi3 → Llama 3)
- 협업 기능 추가
- VR/AR 지원

## 라이선스

LG Electronics Internal Use Only
