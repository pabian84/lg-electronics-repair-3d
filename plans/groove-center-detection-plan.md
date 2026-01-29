# 홈 탐지 및 중심점 체크 구현 계획

## 1. 함수 차이점 분석

| 기능 | `createSingleMeshCloneHighlight` | `highlightFacesByCameraFilter` |
| :--- | :--- | :--- |
| **위치** | `StencilOutlineHighlight.ts` | `NormalBasedHighlight.ts` |
| **방식** | 전체 메쉬 클론 + 스텐실 버퍼 외곽선 | 면 법선(Normal) 분석 + 카메라 방향 필터링 |
| **하이라이트 범위** | 객체 전체 (외곽선 위주) | 카메라를 향하는 특정 면들 (내부 채우기 포함) |
| **용도** | 객체 선택 강조 | 특정 방향의 면 식별, 홈 입구 찾기 |

## 2. 요청 기능 구현 전략 (면 하이라이트 -> 홈 탐지 -> 중심점 체크)

사용자가 원하는 "면 하이라이트 후 홈의 중심점을 체크"하는 기능은 다음과 같은 단계로 구현합니다.

### 단계 1: 시각적 하이라이트 (Visual Feedback)
- `NormalBasedHighlight.highlightFacesByCameraFilter`를 사용하여 현재 카메라 시점에서 보이는 면들을 하이라이트합니다.
- 정면 면은 빨간색, 측면/벽면은 노란색으로 표시하여 홈의 구조를 시각적으로 파악할 수 있게 합니다.

### 단계 2: 기하학적 분석 및 클러스터링 (Groove Detection)
- `GrooveDetectionUtils.calculateMultipleVirtualPivotsByNormalAnalysis`를 활용합니다.
- 이 함수는 법선 벡터가 일치하는 면들을 거리 기반으로 그룹화(Clustering)하여 독립적인 "홈" 영역들을 찾아냅니다.

### 단계 3: 중심점 추출 및 마커 표시 (Coordinate Extraction)
- 탐지된 각 홈 클러스터의 중심 좌표(`position`)를 추출합니다.
- `ClickPointMarker` 유틸리티를 사용하여 해당 좌표에 작은 구체(Sphere) 마커를 생성하여 화면에 표시합니다.

## 3. 상세 구현 로직 (예시)

```typescript
// 1. 시각적 하이라이트 적용
normalBasedHighlight.highlightFacesByCameraFilter(targetNode, camera);

// 2. 홈 분석 및 중심점 계산
const pivots = GrooveDetectionUtils.calculateMultipleVirtualPivotsByNormalAnalysis(
    targetNode,
    cameraDirection, // 카메라 방향 기준
    0.2,             // 허용 오차
    0.05             // 클러스터링 거리 (5cm)
);

// 3. 결과 표시
pivots.forEach(pivot => {
    console.log("탐지된 홈 중심점:", pivot.position);
    // 마커 표시 로직 추가
    visualizeCenterPoint(pivot.position);
});
```

## 4. 기대 효과
- 사용자는 카메라를 돌려가며 특정 방향에서 보이는 홈들을 즉시 확인할 수 있습니다.
- 단순한 시각적 강조를 넘어, 실제 조립에 필요한 정밀한 좌표(중심점)를 자동으로 얻을 수 있습니다.
