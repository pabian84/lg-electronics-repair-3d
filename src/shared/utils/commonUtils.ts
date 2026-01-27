import * as THREE from 'three';
import { invalidate } from '@react-three/fiber';

/**
 * Three.js 객체의 정밀 바운딩 박스를 계산하는 함수
 * @param targetNode 대상 노드
 * @returns 계산된 바운딩 박스
 */
export const getPreciseBoundingBox = (targetNode: THREE.Object3D): THREE.Box3 => {
    const box = new THREE.Box3();
    let hasMesh = false;

    // 월드 매트릭스 최신화
    targetNode.updateMatrixWorld(true);

    targetNode.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const geomBox = child.geometry.boundingBox;
            if (geomBox && !geomBox.isEmpty()) {
                const worldBox = geomBox.clone();
                worldBox.applyMatrix4(child.matrixWorld);
                box.union(worldBox);
                hasMesh = true;
            }
        }
    });

    // 메쉬가 없으면 위치 기준으로라도 잡음
    if (!hasMesh || box.isEmpty()) {
        const pos = new THREE.Vector3();
        targetNode.getWorldPosition(pos);
        box.setFromCenterAndSize(pos, new THREE.Vector3(1, 1, 1));
    }
    return box;
};

/**
 * 카메라를 대상 박스로 포커스하는 애니메이션 함수
 * @param camera 카메라
 * @param targetBox 대상 바운딩 박스
 * @param controls 카메라 컨트롤 (옵션)
 * @param duration 애니메이션 지속 시간 (초)
 */
export const debugFocusCamera = (
    camera: THREE.PerspectiveCamera,
    targetBox: THREE.Box3,
    controls?: { target: THREE.Vector3; update: () => void },
    duration: number = 1.0
) => {
    const center = new THREE.Vector3();
    targetBox.getCenter(center);
    targetBox.getSize(new THREE.Vector3());

    // 객체의 가장 긴 모서리 길이 (대각선 길이 포함 고려)
    // Box3의 min, max를 이용해 대각선 길이를 구하는 것이 더 안전할 수 있음
    const diagonal = targetBox.min.distanceTo(targetBox.max);

    // FOV를 고려한 거리 계산 (화면에 꽉 차게 들어오는 거리)
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(diagonal / 2 / Math.tan(fov / 2));

    // 객체 크기에 따라 동적으로 zoomRatio 조절
    // 작은 객체: 3.0, 중간 객체: 2.0, 큰 객체: 1.5
    let zoomRatio = 2.0; // 기본값
    if (diagonal < 5) {
        zoomRatio = 3.0; // 작은 객체는 더 가깝게
    } else if (diagonal > 20) {
        zoomRatio = 1.5; // 큰 객체는 더 가깝게
    }
    cameraDistance *= zoomRatio;

    console.log(`Camera Focus:`);
    console.log(`   Target Size (Diagonal): ${diagonal.toFixed(2)}`);
    console.log(`   Final Distance: ${cameraDistance.toFixed(2)}`);

    // 카메라 방향 설정 (정면에서 살짝만 위/오른쪽)
    // Z축(1.0)을 강조하여 너무 측면으로 돌지 않게 함
    const direction = new THREE.Vector3(0.5, 0.8, 1.0).normalize();

    // 최종 목표 위치
    const newCameraPos = center.clone().add(direction.multiplyScalar(cameraDistance));

    const startCameraPos = camera.position.clone();
    const startTarget = controls?.target?.clone() || new THREE.Vector3();

    const startTime = performance.now();
    const animateCamera = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        camera.position.lerpVectors(startCameraPos, newCameraPos, ease);
        camera.lookAt(center);

        if (controls) {
            const currentTarget = new THREE.Vector3();
            currentTarget.lerpVectors(startTarget, center, ease);
            controls.target.copy(currentTarget);
            controls.update();
        }
        invalidate();
        if (progress < 1) requestAnimationFrame(animateCamera);
    };
    requestAnimationFrame(animateCamera);
};

/**
 * 하이라이트용 MeshBasicMaterial을 생성하는 함수
 * @param color 색상 (16진수)
 * @param opacity 투명도 (기본값 0.8)
 * @returns 하이라이트 재질
 */
export const createHighlightMaterial = (color: number, opacity: number = 0.8): THREE.MeshBasicMaterial => {
    return new THREE.MeshBasicMaterial({
        color,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity,
        side: THREE.DoubleSide
    });
};

export const getNodeHierarchy = (node: THREE.Object3D): any => {
    const result: any = {
        name: node.name,
        type: node.type,
        children: [],
    };

    if (node.children.length > 0) {
        node.children.forEach((child) => {
            result.children.push(getNodeHierarchy(child));
        });
    }

    return result;
};

/**
 * 법선 벡터 기반 필터링을 사용하여 특정 방향의 면만 선택하고,
 * 해당 면에서 홈(모서리) 부분만 하이라이트하는 함수
 * @param targetNode 대상 노드
 * @param color 하이라이트 색상
 * @param thresholdAngle 엣지로 판정할 최소 각도 (기본값 15도)
 * @param targetNormal 필터링할 방향 법선 벡터 (기본값: Z축 방향 [0, 0, 1])
 * @param normalTolerance 법선 벡터 허용 오차 (기본값: 0.2)
 * @returns 생성된 LineSegments 객체들의 배열
 */
export const createGrooveHighlight = (
    targetNode: THREE.Object3D,
    color: number = 0x00ffff,
    thresholdAngle: number = 15,
    targetNormal: THREE.Vector3 = new THREE.Vector3(0, 0, 1),
    normalTolerance: number = 0.2
): THREE.LineSegments[] => {
    const highlights: THREE.LineSegments[] = [];

    // 월드 매트릭스 최신화 (정확한 좌표 추출을 위해 필수)
    targetNode.updateMatrixWorld(true);

    targetNode.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
            const geometry = child.geometry;

            // 법선 벡터가 없으면 계산
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }

            const positions = geometry.attributes.position;
            const normals = geometry.attributes.normal;
            const indices = geometry.index;

            // 필터링된 인덱스를 저장할 배열
            const filteredIndices: number[] = [];

            if (indices) {
                // 인덱스 버퍼가 있는 경우
                for (let i = 0; i < indices.count; i += 3) {
                    const idx1 = indices.getX(i);
                    const idx2 = indices.getX(i + 1);
                    const idx3 = indices.getX(i + 2);

                    // 세 정점의 법선 벡터 가져오기
                    const normal1 = new THREE.Vector3(
                        normals.getX(idx1),
                        normals.getY(idx1),
                        normals.getZ(idx1)
                    );
                    const normal2 = new THREE.Vector3(
                        normals.getX(idx2),
                        normals.getY(idx2),
                        normals.getZ(idx2)
                    );
                    const normal3 = new THREE.Vector3(
                        normals.getX(idx3),
                        normals.getY(idx3),
                        normals.getZ(idx3)
                    );

                    // 로컬 법선 벡터를 월드 법선 벡터로 변환
                    normal1.applyQuaternion(child.quaternion);
                    normal2.applyQuaternion(child.quaternion);
                    normal3.applyQuaternion(child.quaternion);

                    // 평균 법선 벡터 계산
                    const avgNormal = new THREE.Vector3()
                        .addVectors(normal1, normal2)
                        .add(normal3)
                        .normalize();

                    // 타겟 법선 벡터와의 비교 (내적 값으로 비교)
                    const dotProduct = Math.abs(avgNormal.dot(targetNormal));

                    // 허용 오차 범위 내에 있는 면만 선택
                    if (dotProduct > (1 - normalTolerance)) {
                        filteredIndices.push(idx1, idx2, idx3);
                    }
                }
            } else {
                // 인덱스 버퍼가 없는 경우 (비인덱스 지오메트리)
                for (let i = 0; i < positions.count; i += 3) {
                    const normal1 = new THREE.Vector3(
                        normals.getX(i),
                        normals.getY(i),
                        normals.getZ(i)
                    );
                    const normal2 = new THREE.Vector3(
                        normals.getX(i + 1),
                        normals.getY(i + 1),
                        normals.getZ(i + 1)
                    );
                    const normal3 = new THREE.Vector3(
                        normals.getX(i + 2),
                        normals.getY(i + 2),
                        normals.getZ(i + 2)
                    );

                    normal1.applyQuaternion(child.quaternion);
                    normal2.applyQuaternion(child.quaternion);
                    normal3.applyQuaternion(child.quaternion);

                    const avgNormal = new THREE.Vector3()
                        .addVectors(normal1, normal2)
                        .add(normal3)
                        .normalize();

                    const dotProduct = Math.abs(avgNormal.dot(targetNormal));

                    if (dotProduct > (1 - normalTolerance)) {
                        filteredIndices.push(i, i + 1, i + 2);
                    }
                }
            }

            // 필터링된 면이 있는 경우에만 EdgesGeometry 생성
            if (filteredIndices.length > 0) {
                // 필터링된 인덱스로 새로운 지오메트리 생성
                const filteredGeometry = new THREE.BufferGeometry();
                const filteredPositions = new Float32Array(filteredIndices.length * 3);

                for (let i = 0; i < filteredIndices.length; i++) {
                    const idx = filteredIndices[i];
                    filteredPositions[i * 3] = positions.getX(idx);
                    filteredPositions[i * 3 + 1] = positions.getY(idx);
                    filteredPositions[i * 3 + 2] = positions.getZ(idx);
                }

                filteredGeometry.setAttribute('position', new THREE.BufferAttribute(filteredPositions, 3));

                // EdgesGeometry 생성 (필터링된 면만)
                const edges = new THREE.EdgesGeometry(filteredGeometry, thresholdAngle);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color,
                    linewidth: 2,
                    transparent: true,
                    opacity: 0.8,
                    depthTest: false
                });

                const lineSegments = new THREE.LineSegments(edges, lineMaterial);

                // 대상 메쉬의 월드 트랜스폼 적용
                lineSegments.applyMatrix4(child.matrixWorld);

                highlights.push(lineSegments);
            }
        }
    });

    return highlights;
};

export const exportHierarchyToJson = (hierarchy: any, filename: string = "scene_hierarchy.json") => {
    const json = JSON.stringify(hierarchy, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};