// import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
// import {
//     DOOR_NODE_NAME,
//     RIGHT_DOOR_NODE_NAME,
//     LOWER_LEFT_DOOR_NODE_NAME,
//     LOWER_RIGHT_DOOR_NODE_NAME
// } from '../data/commonConstants';


/**
 * 클릭된 노드를 부모로부터 분리하는 함수
 * @param event 마우스 이벤트
 */
export const removeClickedNode = (event: ThreeEvent<MouseEvent>) => {
    console.log('removeClickedNode!!!');
    event.stopPropagation();
    if (!event.intersections || event.intersections.length === 0) {
        return;
    }

    const clickedObject = event.intersections[0].object;

    if (clickedObject && clickedObject.parent) {
        clickedObject.parent.remove(clickedObject);
        console.log('클릭된 오브젝트를 부모로부터 분리했습니다: ' + clickedObject.name);
    }

};
