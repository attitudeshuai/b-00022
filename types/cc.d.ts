declare module 'cc' {
    export const _decorator: {
        ccclass: (name?: string) => ClassDecorator;
        property: (options?: any) => PropertyDecorator;
    };

    export class Component {}
    export class Node {
        active: boolean;
        activeInHierarchy: boolean;
        isValid: boolean;
        name: string;
        position: any;
        worldPosition: any;
        worldScale: any;
        scale: any;
        layer: number;
        children: Node[];
        parent: Node | null;
        setParent(parent: Node | null): void;
        setPosition(x: number, y: number, z: number): void;
        setPosition(pos: any): void;
        setWorldPosition(x: number, y: number, z: number): void;
        getComponent<T>(type: any): T | null;
        getComponentInChildren<T>(type: any): T | null;
        getChildByName(name: string): Node | null;
        setScale(x: number, y: number, z: number): void;
        setRotationFromEuler(x: number, y: number, z: number): void;
        destroy(): boolean;
    }
    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        static copy(out: Vec3, a: Vec3): Vec3;
    }
    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        constructor(r?: number, g?: number, b?: number, a?: number);
    }
    export class Prefab {}
    export class Label {
        string: string;
    }
    export class Button {
        interactable: boolean;
        enabled: boolean;
        node: Node;
        static EventType: {
            CLICK: string;
        };
        off(type: string, callback: any, target?: any): void;
        on(type: string, callback: any, target?: any): void;
    }
    export class MeshRenderer {
        material: any;
        enabled: boolean;
        setProperty(name: string, value: any): void;
    }
    export class RigidBody {
        linearVelocity: Vec3;
        linearFactor: Vec3;
        wakeUp(): void;
        setLinearVelocity(velocity: Vec3): void;
        setAngularVelocity(velocity: Vec3): void;
    }
    export class BoxCollider {
        size: Vec3;
        center: Vec3;
        node: Node;
        on(type: string, callback: any, target?: any): void;
        off(type: string, callback: any, target?: any): void;
    }
    export class Collider {
        node: Node;
        on(type: string, callback: any, target?: any): void;
        off(type: string, callback: any, target?: any): void;
    }
    export interface ICollisionEvent {
        otherCollider: Collider;
        contacts?: any[];
    }
    export class Animation {
        clips: AnimationClip[];
        defaultClip: AnimationClip;
        playOnLoad: boolean;
        play(name?: string): void;
        getState(name: string): any;
    }
    export class AnimationClip {
        name: string;
        duration: number;
        static WrapMode: {
            Loop: number;
            Normal: number;
        };
    }
    export class SkeletalAnimation {
        clips: AnimationClip[];
        defaultClip: AnimationClip;
        play(name?: string): void;
        getState(name: string): any;
    }
    export class Tween<T> {
        static stopAllByTarget(target: any): void;
        to(duration: number, props: any, opts?: any): Tween<T>;
        call(callback: () => void): Tween<T>;
        start(): void;
        stop(): void;
    }
    export function tween<T>(target: T): Tween<T>;
    export function instantiate(prefab: any): any;

    export const input: {
        on(type: string, callback: any, target?: any): void;
        off(type: string, callback: any, target?: any): void;
    };
    export const Input: {
        EventType: {
            TOUCH_START: string;
            TOUCH_END: string;
            TOUCH_CANCEL: string;
        };
    };
    export class EventTouch {}

    export const PhysicsSystem: {
        instance: {
            debugDrawFlags: number;
        };
    };
    export const EPhysicsDrawFlags: {
        WIRE_FRAME: number;
        AABB: number;
    };

    export const profiler: {
        hideStats(): void;
    };

    export const assetManager: {
        loadAny(options: any, callback: (err: Error | null, asset: any) => void): void;
    };
}
