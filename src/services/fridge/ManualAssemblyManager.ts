import * as THREE from 'three';
import gsap from 'gsap';
import { PartAssemblyService } from './PartAssemblyService';
import {
    LEFT_DOOR_DAMPER_COVER_BODY_NODE,
    LEFT_DOOR_DAMPER_ASSEMBLY_NODE,
    DAMPER_COVER_SLOT_OFFSET
} from '../../shared/utils/fridgeConstants';
import { getDamperAssemblyService } from '../fridge/DamperAssemblyService';
import { StencilOutlineHighlight } from '../../shared/utils/StencilOutlineHighlight';
import { getMetadataLoader } from '../../shared/utils/MetadataLoader';
import { GrooveDetectionUtils } from '../../shared/utils/GrooveDetectionUtils';

/**
 * 수동 조립 관리자
 * 조립/분해 관련 함수를集中管理
 */
export class ManualAssemblyManager {
    private partAssemblyService: PartAssemblyService | null = null;
    private sceneRoot: THREE.Object3D | null = null;
    private cameraControls: any = null;
    private assemblyProgress: number = 0;
    private isAssemblyPlaying: boolean = false;

    /**
     * 카메라 컨트롤 설정
     * @param cameraControls OrbitControls 또는 CameraControls 객체
     */
    public setCameraControls(cameraControls: any): void {
        this.cameraControls = cameraControls;
    }

    /**
     * 서비스 초기화
     * @param sceneRoot 3D 씬의 루트 노드
     */
    public initialize(sceneRoot: THREE.Object3D, cameraControls?: any): void {
        this.sceneRoot = sceneRoot;
        this.cameraControls = cameraControls || null;
        this.partAssemblyService = new PartAssemblyService(sceneRoot);

        // DamperAssemblyService도 초기화해야 함
        const damperService = getDamperAssemblyService();
        damperService.initialize(sceneRoot);

        console.log('[ManualAssemblyManager] 초기화 완료');
    }

    /**
     * 조립 준비
     * 대상 노드를 목표 위치로 이동시킵니다.
     */
    public async prepareManualAssembly(options?: {
        duration?: number;
        snapThreshold?: number;
        onProgress?: (progress: number) => void;
        onComplete?: () => void;
    }): Promise<void> {
        if (!this.partAssemblyService || !this.sceneRoot) {
            throw new Error('[ManualAssemblyManager] 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
        }

        console.log('[ManualAssemblyManager] 조립 준비 시작');
        this.isAssemblyPlaying = true;

        try {
            await this.partAssemblyService.animateLinearAssembly(
                LEFT_DOOR_DAMPER_COVER_BODY_NODE,
                LEFT_DOOR_DAMPER_ASSEMBLY_NODE,
                {
                    duration: options?.duration || 2500,
                    slotOffset: DAMPER_COVER_SLOT_OFFSET, // 슬롯 오프셋 적용
                    onProgress: (progress) => {
                        this.assemblyProgress = progress;
                        options?.onProgress?.(progress);
                    },
                    onComplete: () => {
                        console.log('[ManualAssemblyManager] 조립 완료');
                        this.isAssemblyPlaying = false;
                        this.assemblyProgress = 1;
                        options?.onComplete?.();
                    }
                }
            );
        } catch (error) {
            console.error('[ManualAssemblyManager] 조립 실패:', error);
            this.isAssemblyPlaying = false;
            throw error;
        }
    }

    /**
     * 조립 진행률 업데이트
     * 애니메이션 진행 중 상태를 업데이트합니다.
     */
    public updateManualProgress(progress: number): void {
        this.assemblyProgress = Math.max(0, Math.min(1, progress));
        console.log(`[ManualAssemblyManager] 진행률 업데이트: ${(this.assemblyProgress * 100).toFixed(1)}%`);
    }

    /**
     * 분해 (원래 위치로 복귀)
     */
    public async disassembleDamperCover(options?: {
        duration?: number;
        onComplete?: () => void;
    }): Promise<void> {
        if (!this.partAssemblyService) {
            throw new Error('[ManualAssemblyManager] 초기화되지 않았습니다.');
        }

        console.log('[ManualAssemblyManager] 분해 시작');
        this.isAssemblyPlaying = true;

        try {
            await this.partAssemblyService.disassemblePart(
                LEFT_DOOR_DAMPER_COVER_BODY_NODE,
                {
                    duration: options?.duration || 1500,
                    onComplete: () => {
                        console.log('[ManualAssemblyManager] 분해 완료');
                        this.isAssemblyPlaying = false;
                        this.assemblyProgress = 0;
                        options?.onComplete?.();
                    }
                }
            );
        } catch (error) {
            console.error('[ManualAssemblyManager] 분해 실패:', error);
            this.isAssemblyPlaying = false;
            throw error;
        }
    }

    /**
     * 현재 진행률 반환
     */
    public getProgress(): number {
        return this.assemblyProgress;
    }

    /**
     * 애니메이션 재생 중인지 확인
     */
    public isPlaying(): boolean {
        return this.isAssemblyPlaying;
    }

    /**
     * 서비스 정리
     */
    public dispose(): void {
        this.partAssemblyService?.dispose();
        this.partAssemblyService = null;
        this.sceneRoot = null;
        this.assemblyProgress = 0;
        this.isAssemblyPlaying = false;
        console.log('[ManualAssemblyManager] 서비스 정리 완료');
    }

    /**
     * 댐퍼 커버 조립 (Bounding Box & Offset + Metadata Mapping 방식)
     * 더미 노드가 없는 경우, Bounding Box 기반으로 홈을 식별하고 Metadata의 오프셋을 적용합니다.
     * @param options 조립 옵션
     * @param _camera 카메라 객체 (선택사항, 제공되지 않으면 자동 탐색) - 현재 미사용
     */
    public async assembleDamperCover(
        options?: {
            duration?: number;
            onComplete?: () => void;
        },
        _camera?: THREE.Camera
    ): Promise<void> {
        if (!this.sceneRoot) {
            console.warn('[ManualAssemblyManager] sceneRoot가 초기화되지 않았습니다.');
            return;
        }

        console.log('[ManualAssemblyManager] 댐퍼 커버 조립 시작 (Bounding Box & Offset + Metadata Mapping 방식)');

        try {
            // 1. 타겟 노드 찾기
            const damperAssembly = this.sceneRoot.getObjectByName(LEFT_DOOR_DAMPER_ASSEMBLY_NODE);
            const damperCover = this.sceneRoot.getObjectByName(LEFT_DOOR_DAMPER_COVER_BODY_NODE);

            if (!damperAssembly || !damperCover) {
                console.error('[ManualAssemblyManager] 노드를 찾을 수 없습니다.');
                console.error('  - Damper Assembly:', damperAssembly ? 'found' : 'not found');
                console.error('  - Damper Cover:', damperCover ? 'found' : 'not found');
                return;
            }

            // 2. 메타데이터 로딩
            const metadataLoader = getMetadataLoader();
            const config = await metadataLoader.loadAssemblyConfig('damper_cover_assembly');

            if (!config) {
                console.warn('[ManualAssemblyManager] 메타데이터를 찾을 수 없습니다. 기본값을 사용합니다.');
            }

            // 3. 홈 영역 식별 (Bounding Box 기반)
            const innerBoundRatio = config?.grooveDetection.innerBoundRatio || 0.3;
            const grooveCenter = GrooveDetectionUtils.calculateGrooveCenterByBoundingBox(
                damperAssembly,
                innerBoundRatio
            );

            if (!grooveCenter) {
                console.error('[ManualAssemblyManager] 홈 중심점을 계산할 수 없습니다.');
                return;
            }

            console.log('[ManualAssemblyManager] 홈 중심점:', {
                x: grooveCenter.x.toFixed(2),
                y: grooveCenter.y.toFixed(2),
                z: grooveCenter.z.toFixed(2)
            });

            // 4. 오프셋 적용 (Metadata Mapping) & [수정 2] 회전 반영
            const insertionOffset = config?.insertion.offset || new THREE.Vector3(0, 0, 0.5);

            // 오프셋 벡터 복사
            const offsetVector = insertionOffset.clone();

            // [중요] 타겟(Damper Assembly)의 월드 회전값을 가져와 오프셋에 적용
            const targetQuaternion = new THREE.Quaternion();
            damperAssembly.getWorldQuaternion(targetQuaternion);
            offsetVector.applyQuaternion(targetQuaternion);

            // 회전이 적용된 오프셋을 중심점에 더함
            const targetPosition = grooveCenter.clone().add(offsetVector);

            console.log('[ManualAssemblyManager] 타겟 위치 (오프셋 및 회전 적용):', {
                x: targetPosition.x.toFixed(2),
                y: targetPosition.y.toFixed(2),
                z: targetPosition.z.toFixed(2)
            });

            // 5. 월드 좌표를 로컬 좌표로 변환
            const parent = damperCover.parent;
            let targetLocalPos: THREE.Vector3;
            if (parent) {
                const worldToLocalMatrix = parent.matrixWorld.clone().invert();
                targetLocalPos = targetPosition.clone().applyMatrix4(worldToLocalMatrix);
            } else {
                targetLocalPos = targetPosition;
            }

            console.log('[ManualAssemblyManager] 타겟 로컬 위치:', {
                x: targetLocalPos.x.toFixed(2),
                y: targetLocalPos.y.toFixed(2),
                z: targetLocalPos.z.toFixed(2)
            });

            // 6. 현재 위치 저장 (디버깅용)
            const startPos = damperCover.position.clone();
            console.log('[ManualAssemblyManager] 시작 위치:', {
                x: startPos.x.toFixed(2),
                y: startPos.y.toFixed(2),
                z: startPos.z.toFixed(2)
            });

            // 7. GSAP 애니메이션으로 삽입
            const duration = options?.duration || config?.animation.duration || 1500;
            const easing = config?.animation.easing || 'power2.inOut';

            await new Promise<void>((resolve) => {
                gsap.to(damperCover.position, {
                    x: targetLocalPos.x,
                    y: targetLocalPos.y,
                    z: targetLocalPos.z,
                    duration: duration / 1000,
                    ease: easing,
                    onUpdate: () => {
                        // 애니메이션 진행状況 출력 (선택적)
                        // const progress = damperCover.position.distanceTo(startPos) / targetLocalPos.distanceTo(startPos);
                    },
                    onComplete: () => {
                        console.log('[ManualAssemblyManager] 댐퍼 커버 조립 완료!');
                        console.log('  - 최종 위치:', {
                            x: damperCover.position.x.toFixed(2),
                            y: damperCover.position.y.toFixed(2),
                            z: damperCover.position.z.toFixed(2)
                        });
                        options?.onComplete?.();
                        resolve();
                    }
                });
            });

        } catch (error) {
            console.error('[ManualAssemblyManager] 댐퍼 커버 조립 중 오류 발생:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스 (전역에서 사용 가능)
let manualAssemblyManagerInstance: ManualAssemblyManager | null = null;

/**
 * 싱글톤 인스턴스 가져오기
 */
export function getManualAssemblyManager(): ManualAssemblyManager {
    if (!manualAssemblyManagerInstance) {
        manualAssemblyManagerInstance = new ManualAssemblyManager();
    }
    return manualAssemblyManagerInstance;
}

/**
 * 조립 준비 함수 (간편 호출용)
 */
export async function prepareManualAssembly(
    sceneRoot: THREE.Object3D,
    options?: {
        duration?: number;
        snapThreshold?: number;
        onProgress?: (progress: number) => void;
        onComplete?: () => void;
    }
): Promise<void> {
    const manager = getManualAssemblyManager();
    manager.initialize(sceneRoot);
    await manager.prepareManualAssembly(options);
}

/**
 * 진행률 업데이트 함수 (간편 호출용)
 */
export function updateManualProgress(progress: number): void {
    const manager = getManualAssemblyManager();
    manager.updateManualProgress(progress);
}

/**
 * 분해 함수 (간편 호출용)
 */
export async function disassembleDamperCover(
    sceneRoot: THREE.Object3D,
    options?: {
        duration?: number;
        onComplete?: () => void;
    }
): Promise<void> {
    const manager = getManualAssemblyManager();
    manager.initialize(sceneRoot);
    await manager.disassembleDamperCover(options);
}

/**
 * [New] 외부에서 호출 가능한 조립 함수 export
 * @param duration 애니메이션 지속 시간
 * @param camera 카메라 객체 (선택사항)
 */
export async function runDamperAssembly(duration: number = 1500, camera?: THREE.Camera): Promise<void> {
    const manager = getManualAssemblyManager();
    await manager.assembleDamperCover({ duration }, camera);
}
