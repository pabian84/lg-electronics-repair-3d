import { DoorType, AnimationAction, AnimationCommand } from './AnimatorAgent';

// Damper service commands
export const getDamperAnimationCommands = (): AnimationCommand[] => {
    console.log('Detected damper service command');
    return [
        {
            door: DoorType.TOP_LEFT,
            action: AnimationAction.OPEN,
            degrees: 45,
            speed: 3
        },
        {
            door: DoorType.BOTTOM_LEFT,
            action: AnimationAction.OPEN,
            degrees: 180,
            speed: 3
        }
    ];
};

// Check if input contains damper keyword
export const isDamperCommand = (input: string): boolean => {
    return input.includes('damper');
};
