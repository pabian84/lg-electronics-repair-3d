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
     * 댐퍼 어셈블리 노드의 홈 부분을 식별하고 하이라이트 효과를 적용합니다.
     */
    public highlightDamperGroove(): void {
        if (!this.sceneRoot) return;

        // 1. 대상 노드 및 하위 Mesh 확보
        let damperMesh: THREE.Mesh | null = null;
        const damperNode = this.sceneRoot.getObjectByName(LEFT_DOOR_DAMPER_ASSEMBLY_NODE);
        damperNode?.traverse((child) => {
            if (child instanceof THREE.Mesh) damperMesh = child;
        });

        if (!damperMesh) return;
        const mesh = damperMesh as THREE.Mesh;
        const geometry = mesh.geometry;
        if (!geometry) return;

        this.clearHighlights();

        // 2. 바운딩 박스를 통해 부품의 '중앙 영역' 계산
        geometry.computeBoundingBox();
        const localBox = geometry.boundingBox;
        if (!localBox) return;

        const size = new THREE.Vector3();
        localBox.getSize(size);
        const center = new THREE.Vector3();
        localBox.getCenter(center);

        // [수정] 안쪽 홈을 결정하는 로직: 
        // X, Z축 기준 전체 너비의 중앙 30% 영역 안에 있고, Y축 기준 상단에 위치한 엣지만 추출
        const innerBoundX = size.x * 0.15; // 중앙으로부터 좌우 15% (총 30%)
        const innerBoundZ = size.z * 0.15; // 중앙으로부터 앞뒤 15% (총 30%)

        // =====================================================
        // [시각화] 중앙 영역 및 innerBound 범위 디버그 시각화
        // =====================================================
        this.createDebugVisualizations(mesh, localBox, center, size, innerBoundX, innerBoundZ);
        // =====================================================

        const edgesGeom = new THREE.EdgesGeometry(geometry, 25);
        const posAttr = edgesGeom.attributes.position;
        const filteredPositions: number[] = [];

        for (let i = 0; i < posAttr.count; i += 2) {
            const v1 = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            const v2 = new THREE.Vector3(posAttr.getX(i + 1), posAttr.getY(i + 1), posAttr.getZ(i + 1));

            // [핵심 필터] 정점이 중앙 구역(Inner)에 포함되는지 확인
            const isInsideX = Math.abs(v1.x - center.x) < innerBoundX;
            const isInsideZ = Math.abs(v1.z - center.z) < innerBoundZ;
            const isUpperHalf = v1.y > center.y; // 부품의 상단 절반 영역

            if (isInsideX && isInsideZ && isUpperHalf) {
                filteredPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
            }
        }

        // 3. 필터링된 결과가 있을 때만 메쉬 생성
        if (filteredPositions.length > 0) {
            const filteredGeom = new THREE.BufferGeometry();
            filteredGeom.setAttribute('position', new THREE.Float32BufferAttribute(filteredPositions, 3));
            const lineMat = new THREE.LineBasicMaterial({
                color: 0xff0000,
                transparent: true,
                depthTest: false, // 안쪽 홈이 겉면에 가려지지 않게 함
                opacity: 0.8
            });
            const line = new THREE.LineSegments(filteredGeom, lineMat);

            // mesh의 월드 매트릭스를 line에 적용
            line.position.copy(mesh.position);
            line.rotation.copy(mesh.rotation);
            line.scale.copy(mesh.scale);
            line.updateMatrixWorld(true);

            this.activeHighlights = [line];
            this.sceneRoot!.add(line);

            gsap.to(lineMat, { opacity: 0.1, duration: 0.8, repeat: -1, yoyo: true });
        } else {
            console.warn("안쪽 홈 영역에서 엣지를 찾지 못했습니다. 범위를 조정하십시오.");
        }
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
     */
    private createDebugVisualizations(
        mesh: THREE.Mesh,
        localBox: THREE.Box3,
        center: THREE.Vector3,
        size: THREE.Vector3,
        innerBoundX: number,
        innerBoundZ: number
    ): void {
        // 1. 전체 바운딩 박스 (녹색 - 50% 투명)
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            wireframe: false
        });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.position.copy(center);
        boxMesh.position.applyMatrix4(mesh.matrixWorld);
        boxMesh.quaternion.copy(mesh.quaternion);
        boxMesh.scale.copy(mesh.scale);
        boxMesh.updateMatrixWorld(true);

        // 바운딩 박스 외곽선 (녹색 실선)
        const boxEdges = new THREE.EdgesGeometry(boxGeometry);
        const boxLineMat = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        const boxLines = new THREE.LineSegments(boxEdges, boxLineMat);
        boxLines.position.copy(boxMesh.position);
        boxLines.quaternion.copy(boxMesh.quaternion);
        boxLines.scale.copy(boxMesh.scale);
        boxLines.updateMatrixWorld(true);

        // 2. innerBound 영역 (파란색 - XZ 평면 중앙 30%)
        const innerWidth = innerBoundX * 2; // 좌우 15%씩이므로 총 30%
        const innerDepth = innerBoundZ * 2; // 앞뒤 15%씩이므로 총 30%
        const innerHeight = size.y; // 전체 높이

        const innerBoxGeometry = new THREE.BoxGeometry(innerWidth, innerHeight, innerDepth);
        const innerBoxMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 0.15,
            wireframe: false
        });
        const innerBoxMesh = new THREE.Mesh(innerBoxGeometry, innerBoxMaterial);
        innerBoxMesh.position.copy(center);
        innerBoxMesh.position.applyMatrix4(mesh.matrixWorld);
        innerBoxMesh.quaternion.copy(mesh.quaternion);
        innerBoxMesh.scale.copy(mesh.scale);
        innerBoxMesh.updateMatrixWorld(true);

        // innerBound 외곽선 (파란색 실선)
        const innerBoxEdges = new THREE.EdgesGeometry(innerBoxGeometry);
        const innerBoxLineMat = new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.8 });
        const innerBoxLines = new THREE.LineSegments(innerBoxEdges, innerBoxLineMat);
        innerBoxLines.position.copy(innerBoxMesh.position);
        innerBoxLines.quaternion.copy(innerBoxMesh.quaternion);
        innerBoxLines.scale.copy(innerBoxMesh.scale);
        innerBoxLines.updateMatrixWorld(true);

        // 3. 중심점 (빨간색 구 - 바운딩 박스 크기의 0.2%)
        const centerRadius = Math.min(size.x, size.y, size.z) * 0.002;
        const centerGeometry = new THREE.SphereGeometry(centerRadius, 16, 16);
        const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const centerPoint = new THREE.Mesh(centerGeometry, centerMaterial);
        centerPoint.position.copy(center);
        centerPoint.position.applyMatrix4(mesh.matrixWorld);
        centerPoint.updateMatrixWorld(true);

        // 4. innerBound 경계면 표시 (XZ 평면)
        // innerBoundX 경계선 (좌우)
        const boundaryXGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-innerBoundX, size.y / 2, -innerBoundZ),
            new THREE.Vector3(-innerBoundX, size.y / 2, innerBoundZ),
            new THREE.Vector3(innerBoundX, size.y / 2, -innerBoundZ),
            new THREE.Vector3(innerBoundX, size.y / 2, innerBoundZ),
        ]);
        const boundaryXMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 });
        const boundaryXLines = new THREE.LineSegments(boundaryXGeometry, boundaryXMaterial);
        boundaryXLines.position.copy(center);
        boundaryXLines.position.applyMatrix4(mesh.matrixWorld);
        boundaryXLines.quaternion.copy(mesh.quaternion);
        boundaryXLines.scale.copy(mesh.scale);
        boundaryXLines.updateMatrixWorld(true);

        // innerBoundZ 경계선 (앞뒤)
        const boundaryZGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-innerBoundX, size.y / 2, -innerBoundZ),
            new THREE.Vector3(innerBoundX, size.y / 2, -innerBoundZ),
            new THREE.Vector3(-innerBoundX, size.y / 2, innerBoundZ),
            new THREE.Vector3(innerBoundX, size.y / 2, innerBoundZ),
        ]);
        const boundaryZLines = new THREE.LineSegments(boundaryZGeometry, boundaryXMaterial);
        boundaryZLines.position.copy(center);
        boundaryZLines.position.applyMatrix4(mesh.matrixWorld);
        boundaryZLines.quaternion.copy(mesh.quaternion);
        boundaryZLines.scale.copy(mesh.scale);
        boundaryZLines.updateMatrixWorld(true);

        // 모든 디버그 객체添加到 scene과 리스트
        this.debugObjects.push(boxMesh, boxLines, innerBoxMesh, innerBoxLines, centerPoint, boundaryXLines, boundaryZLines);
        this.debugObjects.forEach(obj => this.sceneRoot?.add(obj));

        console.log('[DamperAssemblyService] 디버그 시각화 생성:', {
            전체박스: { size: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})` },
            중심점: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`,
            innerBoundX: innerBoundX.toFixed(2),
            innerBoundZ: innerBoundZ.toFixed(2),
            내부박스: { size: `(${innerWidth.toFixed(2)}, ${innerHeight.toFixed(2)}, ${innerDepth.toFixed(2)})` }
        });
    }

    public dispose(): void {
        this.clearHighlights();
        this.sceneRoot = null;
        console.log('[DamperAssemblyService] 서비스 정리 완료');
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
