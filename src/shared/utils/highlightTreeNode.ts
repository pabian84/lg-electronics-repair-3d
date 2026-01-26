import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { createHighlightMaterial } from '../utils/commonUtils';

// 파란색 하이라이트 재질 (Memoization 불필요, 상수처럼 사용)
const highlightMaterial = createHighlightMaterial(0x0000ff, 0.5);

/**
 * 트리 노드를 하이라이트하는 커스텀 훅
 * @returns 선택된 노드 참조와 노드 선택 핸들러
 */
export const useHighlightTreeNode = () => {
    const selectedNodeRef = useRef<THREE.Object3D | null>(null);  // 선택된 노드를 보관하는 ref


    const handleNodeSelect = useCallback((node: THREE.Object3D) => {  // 노드 선택·하이라이트 로직
        if (selectedNodeRef.current) {
            console.log('이전에 선택된 노드가 있다면 원래대로 복원합니다.');
            selectedNodeRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    // 저장해둔 원래 재질이 있다면 복구
                    if (child.userData.originalMaterial) {
                        child.material = child.userData.originalMaterial;
                        delete child.userData.originalMaterial; // 데이터 정리
                    }
                }
            });
            selectedNodeRef.current = null;
        }

        // 새 노드에 하이라이트 적용
        if (node) {
            console.log('하이라이트용으로 선택된 노드:', node.name);

            // 2. 새로운 노드 하이라이트 적용 (새 노드 하이라이트)
            node.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    // (A) 원래 재질 백업 (아직 백업 안 된 경우만)
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material;
                    }

                    // (B) 파란색 하이라이트 재질 적용
                    child.material = highlightMaterial;
                }
            });

            // 3. 현재 선택된 노드로 등록
            selectedNodeRef.current = node;

            // 4. (선택 사항) 카메라가 해당 객체를 바라보게 하려면 아래 주석 해제
            // const box = new THREE.Box3().setFromObject(node);
            // const center = new THREE.Vector3();
            // box.getCenter(center);
            // controlsRef.current?.target.copy(center);
            // controlsRef.current?.update();
        }
    }, []);

    return { selectedNodeRef, handleNodeSelect };
};