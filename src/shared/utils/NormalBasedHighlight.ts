import * as THREE from 'three';

/**
 * 법선 벡터(Normal Vector) 기반 필터링을 사용하여 하이라이트하는 컴포넌트
 * 카메라를 향하는 면이나 특정 방향의 면만 선택하여 하이라이트 효과를 적용합니다
 */
export class NormalBasedHighlight {
    private sceneRoot: THREE.Object3D | null = null;
    private activeHighlights: THREE.Object3D[] = [];

    public initialize(sceneRoot: THREE.Object3D): void {
        this.sceneRoot = sceneRoot;
    }

    /**
     * [신규] 법선 벡터 기반 필터링 + EdgesGeometry 방식으로
     * 노드의 안쪽 홈 부분을 정밀하게 하이라이트합니다
     * @param targetNode 하이라이트할 대상 노드
     * @param color 하이라이트 색상 (기본값: 빨강)
     * @param thresholdAngle 엣지로 판정할 최소 각도 (기본값: 15도)
     * @param targetNormal 필터링할 방향 법선 벡터 (기본값: Z축 방향)
     * @param normalTolerance 법선 벡터 허용 오차 (기본값: 0.2)
     */
    public highlightFacesByNormalFilter(
        targetNode: THREE.Object3D,
        color: number = 0xff0000,
        thresholdAngle: number = 15,
        targetNormal: THREE.Vector3 = new THREE.Vector3(0, 0, 1),
        normalTolerance: number = 0.2
    ): void {
        console.log('highlightFacesByNormalFilter!!!');
        if (!this.sceneRoot) return;

        this.clearHighlights();

        // 월드 매트릭스 최신화
        targetNode.updateMatrixWorld(true);

        targetNode.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                this.processMeshForNormalFilterHighlight(
                    child,
                    color,
                    thresholdAngle,
                    targetNormal,
                    normalTolerance
                );
            }
        });

        console.log('[NormalBasedHighlight] 법선 필터링 홈 하이라이트 완료');
    }

    /**
     * [신규] 카메라를 기준으로 가장 먼저 보이는 면(가장 가까운 면)만
     * 정밀하게 하이라이트합니다. 카메라 방향과 노드 법선을 직접 비교합니다.
     * @param targetNode 하이라이트할 대상 노드
     * @param camera 카메라 객체
     * @param color 하이라이트 색상 (기본값: 빨강)
     * @param thresholdAngle 엣지로 판정할 최소 각도 (기본값: 15도)
     */
    public highlightFacesByCameraFilter(
        targetNode: THREE.Object3D,
        camera: THREE.Camera,
        color: number = 0xff0000,
        thresholdAngle: number = 15
    ): void {
        console.log('highlightFacesByCameraFilter - Threshold Based!!');
        if (!this.sceneRoot) return;

        this.clearHighlights();

        // 월드 매트릭스 최신화
        targetNode.updateMatrixWorld(true);

        // 카메라 방향 벡터 (카메라가 바라보는 방향)
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.normalize();

        // 모든 메쉬를 순회하며 카메라를 향하는 면들을 수집
        targetNode.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const positions = geometry.attributes.position;
                const normals = geometry.attributes.normal;
                const indices = geometry.index;

                if (!normals) {
                    geometry.computeVertexNormals();
                }

                const filteredIndices: number[] = [];
                const grooveWallIndices: number[] = [];
                const faceCount = indices ? indices.count / 3 : positions.count / 3;

                // 메쉬의 월드 쿼터니언 가져오기 (법선 변환용)
                const worldQuat = new THREE.Quaternion();
                child.getWorldQuaternion(worldQuat);

                for (let i = 0; i < faceCount; i++) {
                    let idx1, idx2, idx3;
                    if (indices) {
                        idx1 = indices.getX(i * 3);
                        idx2 = indices.getX(i * 3 + 1);
                        idx3 = indices.getX(i * 3 + 2);
                    } else {
                        idx1 = i * 3;
                        idx2 = i * 3 + 1;
                        idx3 = i * 3 + 2;
                    }

                    // 평균 법선 계산
                    const avgNormal = this.calculateAverageNormal(
                        geometry.attributes.normal as THREE.BufferAttribute,
                        idx1, idx2, idx3,
                        worldQuat
                    );

                    // 카메라 방향과 법선의 내적 계산
                    // 카메라 방향(시선)과 면 법선이 반대 방향일 때(내적이 음수일 때) 카메라를 향하는 면임
                    const dotProduct = avgNormal.dot(cameraDirection);

                    // 1. 정면을 바라보는 면 (내적이 -0.5 미만) -> 지정된 색상 (기본 빨강)
                    if (dotProduct < -0.5) {
                        filteredIndices.push(idx1, idx2, idx3);
                    }
                    // 2. 그 외 모든 면 (측면 및 배면 포함) -> 노란색으로 채움
                    // 카메라를 등지는 면이라도 홈의 일부일 수 있으므로 모두 포함하여 노란색으로 색상화
                    else {
                        grooveWallIndices.push(idx1, idx2, idx3);
                    }
                }

                // 수집된 면이 있으면 하이라이트 적용
                if (filteredIndices.length > 0) {
                    this.createFilteredMeshHighlight(
                        child,
                        filteredIndices,
                        color,
                        thresholdAngle,
                        0.5 // 정면 면의 불투명도 약간 상향
                    );
                }

                // 홈의 벽면 및 나머지 영역 노란색 하이라이트 적용
                if (grooveWallIndices.length > 0) {
                    this.createFilteredMeshHighlight(
                        child,
                        grooveWallIndices,
                        0xffff00, // 노란색
                        thresholdAngle,
                        0.6 // 노란색 영역은 더 명확하게 보이도록 불투명도 상향
                    );
                }
            }
        });

        console.log('[NormalBasedHighlight] 카메라 방향 기반 다중 면 하이라이트 완료');
    }

    /**
     * [내부 메서드] 개별 메쉬를 처리하여 법선 필터링 하이라이트 생성
     */
    private processMeshForNormalFilterHighlight(
        originalMesh: THREE.Mesh,
        color: number,
        thresholdAngle: number,
        targetNormal: THREE.Vector3,
        normalTolerance: number
    ): void {
        console.log('processMeshForNormalFilterHighlight!!!');
        const geometry = originalMesh.geometry;

        // 법선 벡터가 없으면 계산
        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
        }

        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const indices = geometry.index;

        // 필터링된 인덱스와 제외된 인덱스를 저장할 배열
        const filteredIndices: number[] = [];

        if (indices) {
            // 인덱스 버퍼가 있는 경우
            for (let i = 0; i < indices.count; i += 3) {
                const idx1 = indices.getX(i);
                const idx2 = indices.getX(i + 1);
                const idx3 = indices.getX(i + 2);

                const avgNormal = this.calculateAverageNormal(
                    normals, idx1, idx2, idx3, originalMesh.quaternion
                );

                const dotProduct = Math.abs(avgNormal.dot(targetNormal));
                if (dotProduct > (1 - normalTolerance)) {
                    filteredIndices.push(idx1, idx2, idx3);
                }
            }
        } else {
            // 인덱스 버퍼가 없는 경우
            for (let i = 0; i < positions.count; i += 3) {
                const avgNormal = this.calculateAverageNormal(
                    normals, i, i + 1, i + 2, originalMesh.quaternion
                );

                const dotProduct = Math.abs(avgNormal.dot(targetNormal));
                if (dotProduct > (1 - normalTolerance)) {
                    filteredIndices.push(i, i + 1, i + 2);
                }
            }
        }

        // 필터링된 영역 하이라이트
        if (filteredIndices.length > 0) {
            this.createFilteredMeshHighlight(
                originalMesh,
                filteredIndices,
                color,
                thresholdAngle
            );
        }
    }

    /**
     * [내부 메서드] 평균 법선 벡터 계산
     */
    private calculateAverageNormal(
        normals: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
        idx1: number,
        idx2: number,
        idx3: number,
        quaternion: THREE.Quaternion
    ): THREE.Vector3 {
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

        normal1.applyQuaternion(quaternion);
        normal2.applyQuaternion(quaternion);
        normal3.applyQuaternion(quaternion);

        return new THREE.Vector3()
            .addVectors(normal1, normal2)
            .add(normal3)
            .normalize();
    }

    /**
     * [내부 메서드] 필터링된 영역의 메쉬 클론 + 하이라이트 생성 (EdgesGeometry 사용)
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

        // 3. 내부 채우기 하이라이트
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const fillMesh = new THREE.Mesh(filteredGeometry, fillMaterial);
        fillMesh.applyMatrix4(originalMesh.matrixWorld);

        // 4. 씬에 추가
        this.sceneRoot.add(edgesLine);
        this.sceneRoot.add(fillMesh);

        // 활성 하이라이트 목록에 추가
        this.activeHighlights.push(edgesLine, fillMesh);
    }

    /**
     * [레거시] 법선 벡터 기반 필터링을 사용하여 카메라를 향하는 면만 하이라이트합니다
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
