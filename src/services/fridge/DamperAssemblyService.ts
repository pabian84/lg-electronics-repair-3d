import * as THREE from 'three';
import gsap from 'gsap';
import { createGrooveHighlight } from '../../shared/utils/commonUtils';
import { LEFT_DOOR_DAMPER_ASSEMBLY_NODE } from '../../shared/utils/fridgeConstants';

/**
 * 댐퍼 조립 서비스 (轻型版 - 조립 기능은 ManualAssemblyManager로 이동됨)
 * 이 파일은 단일 getter 함수만 유지
 */

// 싱글톤 인스턴스 (전역에서 사용 가능)
let damperAssemblyServiceInstance: DamperAssemblyService | null = null;

/**
 * 댐퍼 조립 서비스 클래스
 * 조립/분해 기능은 ManualAssemblyManager.ts로 이동됨
 */
export class DamperAssemblyService {
    // 조립 관련 기능은 ManualAssemblyManager로 이동됨
    // 이 클래스는 간단한 상태 관리만 담당
    private sceneRoot: THREE.Object3D | null = null;
    private activeHighlights: THREE.LineSegments[] = [];
    private debugObjects: THREE.Object3D[] = [];

    public initialize(sceneRoot: THREE.Object3D): void {
        this.sceneRoot = sceneRoot;
        console.log('[DamperAssemblyService] 초기화 완료');
    }

    /**
     * 댐퍼 어셈블리의 정면(XY) 홈 영역을 분석하여 시각화합니다.
     */
    public highlightDamperGroove(): void {
        if (!this.sceneRoot) return;

        const targetNode = this.sceneRoot.getObjectByName(LEFT_DOOR_DAMPER_ASSEMBLY_NODE);
        if (!(targetNode instanceof THREE.Mesh)) return;

        // 1. 기존 디버그 객체 제거
        this.clearHighlights();

        // 2. 정점 분석 함수 호출 (이 함수에서 정확한 좌/우 영역의 Box3를 반환합니다)
        const grooveBounds = this.findGrooveBounds(targetNode);
        if (!grooveBounds) {
            console.warn('[DamperDebug] 홈 영역을 분석할 수 없습니다.');
            return;
        }

        // 3. 분석된 결과(leftBox, rightBox)를 바탕으로 테두리 생성
        const maxZ = targetNode.geometry.boundingBox!.max.z;
        this.createBorderFromBox(targetNode, grooveBounds.left, 0xffff00, maxZ);  // 왼쪽 (노란색)
        this.createBorderFromBox(targetNode, grooveBounds.right, 0x00ffff, maxZ); // 오른쪽 (하늘색)

        console.log('[DamperDebug] 정점 분석 기반 홈 시각화 완료');
    }

    /**
     * 계산된 Box3를 기반으로 실제 Plane 테두리를 생성하여 씬에 추가합니다.
     */
    private createBorderFromBox(mesh: THREE.Mesh, box: THREE.Box3, color: number, maxZ: number): void {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // 정면(XY) 기준 PlaneGeometry 생성
        const geom = new THREE.PlaneGeometry(size.x, size.y);
        const edges = new THREE.EdgesGeometry(geom);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color, linewidth: 2, depthTest: false })
        );

        line.renderOrder = 999;
        // 위치: 분석된 영역의 중앙, Z축은 모델의 가장 앞면(maxZ)에 밀착
        line.position.set(center.x, center.y, maxZ + 0.005);
        line.applyMatrix4(mesh.matrixWorld);

        this.sceneRoot?.add(line);
        this.debugObjects.push(line);
    }

    /**
     * [핵심 로직] 모델의 모든 정점을 조사하여 "안쪽으로 들어간" 영역의 바운딩 박스를 찾습니다.
     */
    private findGrooveBounds(mesh: THREE.Mesh): { left: THREE.Box3, right: THREE.Box3 } | null {
        const geometry = mesh.geometry;
        const positions = geometry.attributes.position;
        if (!positions) return null;

        geometry.computeBoundingBox();
        const localBox = geometry.boundingBox!;
        const center = new THREE.Vector3();
        localBox.getCenter(center);

        // 1. Z축 데이터 범위 분석 (정밀 디버깅용)
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (let i = 0; i < positions.count; i++) {
            const z = positions.getZ(i);
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }

        // 홈의 깊이를 판단할 임계값 (전체 두께의 10% 또는 최소 0.001로 자동 설정)
        const depthRange = maxZ - minZ;
        const threshold = Math.max(depthRange * 0.1, 0.001);

        console.log(`[DamperDebug] 모델 분석 정보:`, {
            maxZ: maxZ.toFixed(4),
            minZ: minZ.toFixed(4),
            depthRange: depthRange.toFixed(4),
            appliedThreshold: threshold.toFixed(4),
            localCenterX: center.x.toFixed(4)
        });

        const leftPoints: THREE.Vector3[] = [];
        const rightPoints: THREE.Vector3[] = [];

        // 2. 정점 수집 (중앙 좌표 center.x를 기준으로 좌우 분류)
        for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));

            // 정면(maxZ)보다 일정 깊이 이상 들어간 점만 수집
            if (p.z < maxZ - threshold) {
                // 단순 0이 아닌 모델의 로컬 중심(center.x) 기준으로 좌우 나눔
                if (p.x < center.x) leftPoints.push(p);
                else rightPoints.push(p);
            }
        }

        if (leftPoints.length === 0 || rightPoints.length === 0) {
            console.warn(`[DamperDebug] 정점을 찾지 못함: 좌(${leftPoints.length}), 우(${rightPoints.length})`);
            return null;
        }

        return {
            left: new THREE.Box3().setFromPoints(leftPoints),
            right: new THREE.Box3().setFromPoints(rightPoints)
        };
    }

    /**
     * 적용된 모든 하이라이트를 제거합니다.
     */
    public clearHighlights(): void {
        this.activeHighlights.forEach((line) => {
            gsap.killTweensOf(line.material);
            this.sceneRoot?.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material instanceof THREE.Material) line.material.dispose();
        });
        this.activeHighlights = [];

        // 디버그 객체들도 제거
        this.debugObjects.forEach((obj) => {
            this.sceneRoot?.remove(obj);
            if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) obj.material.dispose();
            }
        });
        this.debugObjects = [];
    }

    /**
     * [시각화] 바운딩 박스 중앙 영역 및 innerBound 범위를 디버그용으로 시각화
     * PlaneGeometry와 EdgesGeometry를 조합하여 노드의 안쪽 홈 테두리 시각화
     */
    private createDebugVisualizations(
        mesh: THREE.Mesh,
        localBox: THREE.Box3,
        center: THREE.Vector3,
        size: THREE.Vector3,
        innerBoundX: number,
        innerBoundZ: number,
        grooveCenter?: THREE.Vector3
    ): void {
        // 디버그 객체 먼저 정리
        this.debugObjects.forEach((obj) => this.sceneRoot?.remove(obj));
        this.debugObjects = [];

        // mesh의 월드 매트릭스 업데이트
        mesh.updateMatrixWorld(true);

        // 1. 전체 바운딩 박스 (BoxGeometry + EdgesGeometry)
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        this.createPlaneWithEdges(boxGeometry, 0x00ff00, 0.1, 0.5, center, mesh);

        // 2. innerBound 영역 (XZ 평면 중앙 30%) - PlaneGeometry 사용
        const innerWidth = innerBoundX * 2;
        const innerDepth = innerBoundZ * 2;
        const innerHeight = size.y;

        const innerBoxGeometry = new THREE.BoxGeometry(innerWidth, innerHeight, innerDepth);
        this.createPlaneWithEdges(innerBoxGeometry, 0x0088ff, 0.15, 0.8, center, mesh);

        // 3. 안쪽 홈 중심점 (구 형태) - 월드 좌표로 변환
        const centerRadius = Math.min(size.x, size.y, size.z) * 0.02;
        const centerGeometry = new THREE.SphereGeometry(centerRadius, 16, 16);
        const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const centerPoint = new THREE.Mesh(centerGeometry, centerMaterial);

        // targetCenter를 월드 좌표로 변환
        const targetCenterWorld = new THREE.Vector3();
        mesh.localToWorld(targetCenterWorld.copy(grooveCenter || center));
        centerPoint.position.copy(targetCenterWorld);
        centerPoint.updateMatrixWorld(true);

        this.debugObjects.push(centerPoint);
        this.sceneRoot?.add(centerPoint);

        // 4. innerBound 경계면 (PlaneGeometry + EdgesGeometry) - XZ 평면
        const boundaryPlaneGeometry = new THREE.PlaneGeometry(innerWidth, innerDepth);
        this.createPlaneWithEdges(boundaryPlaneGeometry, 0xffff00, 0.0, 0.8,
            new THREE.Vector3(center.x, center.y + size.y / 2, center.z), mesh);

        console.log('[DamperAssemblyService] 디버그 시각화 생성:', {
            전체박스: { size: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})` },
            중심점: `(${targetCenterWorld.x.toFixed(2)}, ${targetCenterWorld.y.toFixed(2)}, ${targetCenterWorld.z.toFixed(2)})`,
            innerBoundX: innerBoundX.toFixed(2),
            innerBoundZ: innerBoundZ.toFixed(2)
        });
    }

    /**
     * 지오메트리의 면과 테두리를 시각화하는 헬퍼 메서드
     * PlaneGeometry와 EdgesGeometry를 조합하여 테두리가 있는 평면 생성
     */
    private createPlaneWithEdges(
        geometry: THREE.BufferGeometry,
        faceColor: number,
        faceOpacity: number,
        edgeOpacity: number,
        position: THREE.Vector3,
        mesh: THREE.Mesh
    ): void {
        // 1. 면 (Mesh)
        const material = new THREE.MeshBasicMaterial({
            color: faceColor,
            transparent: true,
            opacity: faceOpacity,
            side: THREE.DoubleSide
        });
        const planeMesh = new THREE.Mesh(geometry, material);
        planeMesh.position.copy(position);
        planeMesh.position.applyMatrix4(mesh.matrixWorld);
        planeMesh.quaternion.copy(mesh.quaternion);
        planeMesh.scale.copy(mesh.scale);
        planeMesh.updateMatrixWorld(true);

        // 2. 테두리 (EdgesGeometry)
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: faceColor,
            transparent: true,
            opacity: edgeOpacity
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.copy(planeMesh.position);
        edges.quaternion.copy(planeMesh.quaternion);
        edges.scale.copy(planeMesh.scale);
        edges.updateMatrixWorld(true);

        // 씬에 추가
        this.debugObjects.push(planeMesh, edges);
        this.sceneRoot?.add(planeMesh);
        this.sceneRoot?.add(edges);
    }

    public dispose(): void {
        this.clearHighlights();
        this.sceneRoot = null;
        console.log('[DamperAssemblyService] 서비스 정리 완료');
    }

    /**
     * 배열의 중앙값을 계산합니다.
     */
    private getMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}

/**
 * 싱글톤 인스턴스 가져오기
 */
export function getDamperAssemblyService(): DamperAssemblyService {
    if (!damperAssemblyServiceInstance) {
        damperAssemblyServiceInstance = new DamperAssemblyService();
    }
    return damperAssemblyServiceInstance;
}
