import { LEFT_DOOR_DAMPER_NODE_NAME } from '../../shared/utils/fridgeConstants';
import * as THREE from 'three';
import { getPreciseBoundingBox } from '../../shared/utils/commonUtils';
import { animate, calculateCameraTargetPosition, NodeCache } from '../../shared/utils/animationUtils';

// Camera movement options
export interface CameraMoveOptions {
    duration?: number; // milliseconds
    zoomRatio?: number; // Custom zoom ratio
    direction?: THREE.Vector3; // Custom camera direction
    onProgress?: (progress: number) => void; // Progress callback
}

// Camera movement service for fridge animations
export class CameraMovementService {
    private cameraControls: any;
    private sceneRoot: THREE.Object3D | null = null;
    private nodeCache: NodeCache = new NodeCache();

    constructor(cameraControls: any, sceneRoot?: THREE.Object3D) {
        this.cameraControls = cameraControls;
        this.sceneRoot = sceneRoot || null;
    }

    // Set scene root reference for node lookup
    public setSceneRoot(sceneRoot: THREE.Object3D): void {
        this.sceneRoot = sceneRoot;
        this.nodeCache.clear(); // Clear cache when scene root changes
    }

    public async moveCameraToNode(nodeName: string, options: CameraMoveOptions = {}): Promise<void> {
        // 단순히 시네마틱 로직을 실행하도록 연결
        return this.moveCameraCinematic(nodeName);
    }

    /**
     * [LG CNS 개선안] 
     * 2단계 시네마틱 이동: 
     * 1단계 - 타겟 정면 수평 정렬 (Alignment)
     * 2단계 - 타겟 중심 lerp를 통한 접근 및 회전 (Zoom & Orbit)
     */
    public async moveCameraCinematic(nodeName: string): Promise<void> {
        const targetNode = this.getNodeByName(nodeName);
        if (!targetNode) {
            console.warn(`[CameraService] Node not found: ${nodeName}`);
            return;
        }

        const targetBox = getPreciseBoundingBox(targetNode);
        const targetCenter = new THREE.Vector3();
        targetBox.getCenter(targetCenter);

        // ---------------------------------------------------------
        // Phase 1: 수평 이동 (Alignment) - 정면 수평 라인 강제 정렬
        // ---------------------------------------------------------
        // 타겟의 크기에 비례하여 정면 거리를 계산합니다.
        const frontOffset = (targetBox.max.z - targetBox.min.z) * 3.0;

        const alignPos = new THREE.Vector3(
            targetCenter.x,          // X축: 타겟의 중심과 일치시켜 정면 라인 확보
            targetCenter.y,          // Y축: 타겟의 높이 중심으로 고정 (수평 라인 정렬)
            targetCenter.z + frontOffset // Z축: 타겟 앞쪽의 기준점
        );

        await new Promise<void>((resolve) => {
            animate(this.cameraControls.object.position, {
                x: alignPos.x,
                y: alignPos.y,
                z: alignPos.z,
                duration: 1.0,
                onUpdate: () => {
                    // 이동 중 타겟 중심을 부드럽게 응시
                    this.cameraControls.target.lerp(targetCenter, 0.05);
                    this.cameraControls.update();
                },
                onComplete: resolve
            });
        });

        // ---------------------------------------------------------
        // Phase 2: 접근 (Zoom & Orbit) - 시선 고정 및 줌인
        // ---------------------------------------------------------
        const finalPos = calculateCameraTargetPosition(
            this.cameraControls.object,
            targetBox,
            {
                zoomRatio: 1.3, // 타겟에 근접
                direction: new THREE.Vector3(0, 0, 1) // 정면 수평 방향에서 봄 (Y축 0으로 고정)
            }
        );

        await new Promise<void>((resolve) => {
            animate(this.cameraControls.object.position, {
                x: finalPos.x,
                y: finalPos.y,
                z: finalPos.z,
                duration: 1.5,
                easing: (t: number) => 1 - Math.pow(1 - t, 3), // EaseOutCubic으로 부드러운 정지
                onUpdate: () => {
                    /**
                     * 연출 포인트: 카메라가 이동하는 동안 컨트롤의 target을 지속적으로 lerp 업데이트합니다.
                     * 이를 통해 카메라가 단순히 직선 이동하는 것이 아니라, 
                     * 타겟 부품을 '응시'하며 궤도를 도는듯한(Orbit) 자연스러운 회전 효과가 발생합니다.
                     */
                    this.cameraControls.target.lerp(targetCenter, 0.1);
                    this.cameraControls.update();
                },
                onComplete: resolve
            });
        });
    }

    /**
     * [추가] webp 시나리오: 커버 -> 레버 -> 힌지 순으로 카메라가 추적하는 시퀀스
     */
    public async playDisassemblyCameraSequence(): Promise<void> {
        // 1단계: 도어 커버 집중 (정면 사선)
        await this.moveCameraToNode("Door_Cover", { duration: 1200, zoomRatio: 2 });

        // 2단계: 레버 분리 시점에 맞춰 상단으로 이동
        await new Promise(resolve => setTimeout(resolve, 500)); // 애니메이션 타이밍 동기화
        await this.moveCameraToNode("Lever_Part", { duration: 1000, direction: new THREE.Vector3(0, 1, 0.5) });

        // 3단계: 힌지 분리 시점에 맞춰 측면 집중
        await this.moveCameraToNode("Hinge_Assembly", { duration: 1000, zoomRatio: 1.2 });
    }

    // Smooth camera movement with duration (Promise-based)
    private async smoothCameraMovement(
        targetPosition: THREE.Vector3,
        targetLookAt: THREE.Vector3,
        options: CameraMoveOptions
    ): Promise<void> {
        const duration = options.duration || 1000; // Default 1 second
        const startPosition = this.cameraControls.object.position.clone();
        const startTarget = this.cameraControls.target.clone();

        await animate((progress: number, eased: number) => {
            // Interpolate between start and target position with horizontal movement and slight downward angle
            const currentPosition = new THREE.Vector3(
                startPosition.x + (targetPosition.x - startPosition.x) * eased,
                targetPosition.y - 1.5, // Move camera slightly below target for upward view
                startPosition.z + (targetPosition.z - startPosition.z) * eased
            );
            this.cameraControls.object.position.copy(currentPosition);

            // Interpolate between start and target look at position
            const currentLookAt = startTarget.clone().lerp(targetLookAt, eased);
            this.cameraControls.target.copy(currentLookAt);

            // Update controls
            this.cameraControls.update();

            // Call progress callback
            if (options.onProgress) {
                options.onProgress(eased);
            }
        }, { duration });
    }

    // Find a node by name in the scene (with caching)
    private getNodeByName(nodeName: string): THREE.Object3D | null {
        if (!this.sceneRoot) {
            console.error('Scene root not available for node lookup');
            return null;
        }

        return this.nodeCache.findNodeByName(this.sceneRoot, nodeName);
    }

    // Calculate the target position for the camera using bounding box
    private calculateTargetPosition(node: any, options: CameraMoveOptions): THREE.Vector3 {
        const targetBox = getPreciseBoundingBox(node);
        return calculateCameraTargetPosition(this.cameraControls.object, targetBox, {
            zoomRatio: options.zoomRatio,
            direction: options.direction
        });
    }

    // Default camera movement parameters
    private static readonly DEFAULT_DAMPER_DURATION = 1000;

    // Move camera to the left door damper node (Promise-based)
    public async moveCameraToLeftDoorDamper(options: CameraMoveOptions = {}): Promise<void> {
        console.log('moveCameraToLeftDoorDamper!!');
        await this.moveCameraToNode(LEFT_DOOR_DAMPER_NODE_NAME, {
            duration: options.duration || CameraMovementService.DEFAULT_DAMPER_DURATION,
            // Ensure horizontal direction for front view
            direction: new THREE.Vector3(1, 0, 0).normalize(),
            ...options
        });
    }
}
