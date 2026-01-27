import * as THREE from 'three';

/**
 * 법선 벡터(Normal Vector) 기반 필터링을 사용하여 하이라이트하는 컴포넌트
 * 카메라를 향하는 면만 선택하여 하이라이트 효과를 적용합니다
 */
export class NormalBasedHighlight {
    private sceneRoot: THREE.Object3D | null = null;
    private activeHighlights: THREE.Object3D[] = [];

    public initialize(sceneRoot: THREE.Object3D): void {
        this.sceneRoot = sceneRoot;
    }

    /**
     * 법선 벡터 기반 필터링을 사용하여 카메라를 향하는 면만 하이라이트합니다
     * @param targetNode 하이라이트할 타겟 노드
     * @param camera 카메라 객체
     * @param color 하이라이트 색상 (기본값: 빨강)
     */
    public highlightFacesByNormal(
        targetNode: THREE.Mesh, 
        camera: THREE.Camera, 
        color: number = 0xff0000
    ): void {
        if (!this.sceneRoot) return;

        this.clearHighlights();

        const geometry = targetNode.geometry;
        if (!geometry.index) return;

        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        const index = geometry.index;

        const faceIndices: number[] = [];
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        // 카메라가 바라보는 방향의 반대 방향(카메라로 향하는 벡터)
        const toCameraVector = cameraDirection.clone().negate();

        const worldNormal = new THREE.Vector3();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(targetNode.matrixWorld);

        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i);

            // 첫 번째 정점의 법선을 해당 면의 대표 법선으로 사용 (Flat Shading 가정 또는 단순화)
            worldNormal.fromBufferAttribute(normalAttribute, a);
            worldNormal.applyMatrix3(normalMatrix).normalize();

            // 법선 벡터와 카메라로 향하는 벡터의 내적 계산
            // 내적이 0보다 크면 카메라를 향하고 있음
            const dot = worldNormal.dot(toCameraVector);

            if (dot > 0.1) { // 임계값(0.1)을 주어 정면을 향하는 면 위주로 선택
                faceIndices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
            }
        }

        if (faceIndices.length > 0) {
            const highlightGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(faceIndices.length * 3);

            for (let i = 0; i < faceIndices.length; i++) {
                const vertexIndex = faceIndices[i];
                positions[i * 3] = positionAttribute.getX(vertexIndex);
                positions[i * 3 + 1] = positionAttribute.getY(vertexIndex);
                positions[i * 3 + 2] = positionAttribute.getZ(vertexIndex);
            }

            highlightGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const highlightMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });

            const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
            highlightMesh.applyMatrix4(targetNode.matrixWorld);

            this.sceneRoot.add(highlightMesh);
            this.activeHighlights.push(highlightMesh);

            console.log('[NormalBasedHighlight] 법선 기반 하이라이트 완료:', {
                faceCount: faceIndices.length / 3,
                dotThreshold: 0.1
            });
        }
    }

    /**
     * 활성화된 모든 하이라이트를 제거합니다
     */
    public clearHighlights(): void {
        this.activeHighlights.forEach(highlight => {
            if (this.sceneRoot) {
                this.sceneRoot.remove(highlight);
            }
            if (highlight instanceof THREE.Mesh) {
                highlight.geometry.dispose();
                if (highlight.material instanceof THREE.Material) {
                    highlight.material.dispose();
                }
            }
        });
        this.activeHighlights = [];
    }

    /**
     * 컴포넌트를 정리합니다
     */
    public dispose(): void {
        this.clearHighlights();
        this.sceneRoot = null;
    }
}
