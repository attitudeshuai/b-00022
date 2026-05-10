declare module 'cc' {
    type Constructor<T = any> = new (...args: any[]) => T;

    export const _decorator: {
        ccclass: (name: string) => ClassDecorator;
        property: PropertyDecoratorFactory;
    };

    interface PropertyDecoratorFactory {
        (typeOrOptions?: Constructor | object): PropertyDecorator;
        (target: object, propertyKey: string | symbol, descriptor?: PropertyDescriptor): void;
    }

    export class Component {
        node: Node;
        getComponent<T>(type: Constructor<T> | string): T | null;
        getComponentInChildren<T>(type: Constructor<T>): T | null;
        scheduleOnce(callback: (...args: any[]) => void, delay?: number): void;
        unschedule(callback: (...args: any[]) => void): void;
    }

    export class Node {
        position: Vec3;
        worldPosition: Vec3;
        scale: Vec3;
        worldScale: Vec3;
        active: boolean;
        activeInHierarchy: boolean;
        isValid: boolean;
        layer: number;
        name: string;
        children: Node[];
        scene: any;
        parent: Node | null;
        constructor(name?: string);
        on(event: string, callback: Function, target?: any): void;
        off(event: string, callback: Function, target?: any): void;
        setPosition(x: number | Vec3, y?: number, z?: number): void;
        setWorldPosition(x: number | Vec3, y?: number, z?: number): void;
        setScale(x: number | Vec3, y?: number, z?: number): void;
        setRotation(rotation: Quat): void;
        setRotationFromEuler(x: number, y: number, z: number): void;
        setParent(parent: Node, worldPositionStays?: boolean): void;
        addChild(child: Node): void;
        getChildByName(name: string): Node | null;
        getComponent<T>(type: Constructor<T> | string): T | null;
        getComponentInChildren<T>(type: Constructor<T>): T | null;
        addComponent<T>(type: Constructor<T>): T;
        destroy(): void;
    }

    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        static copy(out: Vec3, a: Vec3): Vec3;
        static readonly ZERO: Vec3;
    }

    export class Quat {
        x: number;
        y: number;
        z: number;
        w: number;
        static fromEuler(out: Quat, x: number, y: number, z: number): Quat;
    }

    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        constructor(r?: number, g?: number, b?: number, a?: number);
    }

    export class Label extends Component {
        string: string;
    }

    export class Button extends Component {
        node: Node;
        interactable: boolean;
        enabled: boolean;
        static readonly EventType: { CLICK: string };
    }

    export class Prefab extends Component {}

    export class BoxCollider extends Component {
        center: Vec3;
        size: Vec3;
    }

    export class Collider extends Component {
        on(event: string, callback: Function, target?: any): void;
        off(event: string, callback: Function, target?: any): void;
    }

    export class RigidBody extends Component {
        linearVelocity: Vec3;
        linearFactor: Vec3;
        wakeUp(): void;
        setLinearVelocity(value: Vec3): void;
        setAngularVelocity(value: Vec3): void;
    }

    export class MeshRenderer extends Component {
        enabled: boolean;
        material: any;
    }

    export class Animation extends Component {
        playOnLoad: boolean;
        clips: AnimationClip[];
        defaultClip: AnimationClip;
        play(name?: string): void;
        getState(name: string): AnimationState;
    }

    export class SkeletalAnimation extends Component {
        clips: AnimationClip[];
        getState(name: string): AnimationState;
        play(name?: string): void;
    }

    export class AnimationClip {
        name: string;
        duration: number;
        static WrapMode: { Loop: number; Normal: number };
    }

    export interface AnimationState {
        wrapMode: number;
        speed: number;
        duration: number;
    }

    export class DirectionalLight extends Component {
        color: Color;
        illuminance: number;
    }

    export class PhysicsSystem {
        static instance: PhysicsSystem;
        debugDrawFlags: number;
    }

    export const EPhysicsDrawFlags: { WIRE_FRAME: number; AABB: number };

    export const input: {
        on(event: string, callback: Function, target?: any): void;
        off(event: string, callback: Function, target?: any): void;
    };

    export const Input: {
        EventType: { TOUCH_START: string; TOUCH_END: string; TOUCH_CANCEL: string };
    };

    export class EventTouch {
        touch: any;
    }

    export interface ICollisionEvent {
        otherCollider: Collider;
        selfCollider: Collider;
        contacts: any[];
    }

    export const assetManager: {
        loadAny(info: { uuid: string }, callback: (err: Error | null, asset: any) => void): void;
    };

    export function instantiate(prefab: Prefab | Node): Node;
    export function tween(target: any): any;
    export class Tween<T = any> {
        to(duration: number, props: Partial<T>, opts?: object): Tween<T>;
        call(callback: () => void): Tween<T>;
        start(): Tween<T>;
        stop(): void;
        static stopAllByTarget(target: any): void;
    }

    export const profiler: {
        hideStats(): void;
    };
}
