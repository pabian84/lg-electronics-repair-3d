import * as THREE from 'three';

/**
 * Outline Shader/Stencil Buffer 방식을 사용하여 하이라이트하는 컴포넌트
 * 메쉬를 클론하고 Stencil Buffer를 사용하여 외곽선 효과를 생성합니다
 */
export class StencilOutlineHighlight {
    private sceneRoot: THREE.Object3D | null = null;
    private activeHighlights: THREE.Object3D[] = [];

    public initialize(sceneRoot: THREE.Object3D): void {
        this.sceneRoot = sceneRoot;
    }

    /**
     * [레거시] 메쉬를 클론하고 Outline Shader/Stencil Buffer 방식을 사용하여
     * 노드의 안쪽 홈 부분을 하이라이트합니다 (단일 메쉬 대상)
     * @param originalMesh 하이라이트할 원본 메쉬
     * @param color 하이라이트 색상 (기본값: 빨강)
     */
    public createSingleMeshCloneHighlight(originalMesh: THREE.Mesh, color: number = 0xff0000): void {
        if (!this.sceneRoot) return;

        // 원본 메쉬의 월드 매트릭스 업데이트
        originalMesh.updateMatrixWorld(true);

        // 메쉬 클론 (안쪽 홈 부분 하이라이트용)
        const highlightMesh = originalMesh.clone();
        highlightMesh.applyMatrix4(originalMesh.matrixWorld);

        // 안쪽 홈 하이라이트용 재질 설정
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilRef: 1,
            stencilZPass: THREE.ReplaceStencilOp
        });

        highlightMesh.material = highlightMaterial;

        // Outline 메쉬 생성
        const outlineMesh = originalMesh.clone();
        outlineMesh.applyMatrix4(originalMesh.matrixWorld);
        outlineMesh.scale.multiplyScalar(1.03);

        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.BackSide,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.EqualStencilFunc,
            stencilRef: 1,
            stencilZPass: THREE.KeepStencilOp
        });

        outlineMesh.material = outlineMaterial;

        this.sceneRoot.add(highlightMesh);
        this.sceneRoot.add(outlineMesh);
        this.activeHighlights.push(highlightMesh, outlineMesh);

        console.log('[StencilOutlineHighlight] 단일 메쉬 클론 홈 하이라이트 완료');
    }

    /**
     * [내부 메서드] 필터링된 영역의 메쉬 클론 + Stencil 하이라이트 생성
     */
    private createFilteredMeshHighlight(
        originalMesh: THREE.Mesh,
        filteredIndices: number[],
        color: number,
        thresholdAngle: number,
        opacity: number = 0.4
    ): void {
        if (!this.sceneRoot) return;

        // 1. 필터링된 인덱스로 새로운 지오메트리 생성
        const filteredGeometry = new THREE.BufferGeometry();
        const positions = originalMesh.geometry.attributes.position;
        const normals = originalMesh.geometry.attributes.normal;
        const filteredPositions = new Float32Array(filteredIndices.length * 3);
        const filteredNormals = normals ? new Float32Array(filteredIndices.length * 3) : null;

        for (let i = 0; i < filteredIndices.length; i++) {
            const idx = filteredIndices[i];
            filteredPositions[i * 3] = positions.getX(idx);
            filteredPositions[i * 3 + 1] = positions.getY(idx);
            filteredPositions[i * 3 + 2] = positions.getZ(idx);

            if (filteredNormals && normals) {
                filteredNormals[i * 3] = normals.getX(idx);
                filteredNormals[i * 3 + 1] = normals.getY(idx);
                filteredNormals[i * 3 + 2] = normals.getZ(idx);
            }
        }

        filteredGeometry.setAttribute('position', new THREE.BufferAttribute(filteredPositions, 3));
        if (filteredNormals) {
            filteredGeometry.setAttribute('normal', new THREE.BufferAttribute(filteredNormals, 3));
        } else {
            filteredGeometry.computeVertexNormals();
        }

        // 2. 필터링된 지오메트리의 EdgesGeometry 생성 (홈 모서리 하이라이트)
        const edgesGeometry = new THREE.EdgesGeometry(filteredGeometry, thresholdAngle);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false
        });

        const edgesLine = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edgesLine.applyMatrix4(originalMesh.matrixWorld);

        // 3. Stencil Buffer를 사용한 내부 채우기 하이라이트
        const fillGeometry = filteredGeometry.clone();
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilRef: 1,
            stencilZPass: THREE.ReplaceStencilOp
        });

        const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
        fillMesh.applyMatrix4(originalMesh.matrixWorld);

        // 4. 스케일 확대를 사용한 외곽선 효과 (Stencil Buffer 방식)
        const outlineMesh = new THREE.Mesh(filteredGeometry.clone(), fillMaterial.clone());
        outlineMesh.applyMatrix4(originalMesh.matrixWorld);
        outlineMesh.scale.multiplyScalar(1.02);

        const outlineFillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.BackSide,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.EqualStencilFunc,
            stencilRef: 1,
            stencilZPass: THREE.KeepStencilOp
        });
        outlineMesh.material = outlineFillMaterial;

        // 5. 씬에 추가
        this.sceneRoot.add(edgesLine);
        this.sceneRoot.add(fillMesh);
        this.sceneRoot.add(outlineMesh);

        // 활성 하이라이트 목록에 추가
        this.activeHighlights.push(edgesLine, fillMesh, outlineMesh);
    }

    /**
     * [내부 메서드] 단일 면만 하이라이트 생성
     */
    private createSingleFaceHighlight(
        originalMesh: THREE.Mesh,
        faceIndices: number[],
        color: number,
        thresholdAngle: number
    ): void {
        if (!this.sceneRoot) return;

        const positions = originalMesh.geometry.attributes.position;

        // 단일 삼각형의 위치 데이터 추출
        const facePositions = new Float32Array(9);
        for (let i = 0; i < 3; i++) {
            const idx = faceIndices[i];
            facePositions[i * 3] = positions.getX(idx);
            facePositions[i * 3 + 1] = positions.getY(idx);
            facePositions[i * 3 + 2] = positions.getZ(idx);
        }

        // 새 지오메트리 생성
        const faceGeometry = new THREE.BufferGeometry();
        faceGeometry.setAttribute('position', new THREE.BufferAttribute(facePositions, 3));
        faceGeometry.computeVertexNormals();

        // EdgesGeometry로 모서리 하이라이트
        const edgesGeometry = new THREE.EdgesGeometry(faceGeometry, thresholdAngle);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
        });

        const edgesLine = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edgesLine.applyMatrix4(originalMesh.matrixWorld);

        // 내부 채우기 하이라이트
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const fillMesh = new THREE.Mesh(faceGeometry, fillMaterial);
        fillMesh.applyMatrix4(originalMesh.matrixWorld);

        // 씬에 추가
        this.sceneRoot.add(edgesLine);
        this.sceneRoot.add(fillMesh);
        this.activeHighlights.push(edgesLine, fillMesh);

        console.log('[StencilOutlineHighlight] 단일 면 하이라이트 완료');
    }

    /**
     * EdgesGeometry를 사용하여 외곽선 하이라이트를 생성합니다
     * @param originalMesh 하이라이트할 원본 메쉬
     * @param color 하이라이트 색상 (기본값: 빨강)
     */
    public createEdgesHighlight(originalMesh: THREE.Mesh, color: number = 0xff0000): void {
        if (!this.sceneRoot) return;

        originalMesh.updateMatrixWorld(true);

        // EdgesGeometry 생성
        const edgesGeometry = new THREE.EdgesGeometry(originalMesh.geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        const edgesLine = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edgesLine.applyMatrix4(originalMesh.matrixWorld);

        this.sceneRoot.add(edgesLine);
        this.activeHighlights.push(edgesLine);

        console.log('[StencilOutlineHighlight] Edges 하이라이트 완료:', {
            color: `#${color.toString(16)}`,
            edgeCount: edgesGeometry.attributes.position.count / 2
        });
    }

    /**
     * 활성화된 모든 하이라이트를 제거합니다
     */
    public clearHighlights(): void {
        this.activeHighlights.forEach(highlight => {
            if (this.sceneRoot) {
                this.sceneRoot.remove(highlight);
            }
            if (highlight instanceof THREE.Mesh || highlight instanceof THREE.LineSegments) {
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
