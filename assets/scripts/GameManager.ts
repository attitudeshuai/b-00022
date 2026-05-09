import { _decorator, BoxCollider, Button, Color, Component, EPhysicsDrawFlags, Label, MeshRenderer, Node, PhysicsSystem, Prefab, Vec3, instantiate, profiler } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

/**
 * 游戏管理器
 * 负责游戏流程控制、分数管理、平台生成
 */
@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab)
    platformPrefab: Prefab = null;

    @property(Node)
    player: Node = null;

    @property(Node)
    startButton: Node = null;

    @property(Label)
    scoreLabel: Label = null;

    @property(Node)
    gameOverPanel: Node = null;

    @property(Label)
    finalScoreLabel: Label = null;

    private leftPlatform: Node = null;
    private rightPlatform: Node = null;
    private score: number = 0;
    private isGameRunning: boolean = false;
    private startButtonComponent: Button = null;

    // 平台范围设置
    private leftPlatformPos: Vec3 = new Vec3(-5.5, -1.5, 0);
    private minOffsetX: number = 0;
    private rightEdgeX: number = 5.5;
    private platformGap: number = 0.2;
    private playerOffsetY: number = 0.5;

    // 平台颜色方案 - 符合低多边形风格的精选配色
    private platformColors: Color[] = [
        new Color(91, 123, 219, 255),   // 蓝紫色 #5B7BDB
        new Color(78, 205, 196, 255),   // 青色 #4ECDC4
        new Color(149, 225, 211, 255),  // 薄荷绿 #95E1D3
        new Color(170, 150, 218, 255),  // 薰衣草紫 #AA96DA
        new Color(93, 173, 226, 255),   // 天蓝色 #5DADE2
        new Color(177, 156, 217, 255),  // 粉紫色 #B19CD9
    ];

    start() {
        profiler.hideStats();
        PhysicsSystem.instance.debugDrawFlags = EPhysicsDrawFlags.WIRE_FRAME | EPhysicsDrawFlags.AABB;
        this.setupStartButton();
        this.initGame();
    }

    /**
     * 初始化游戏
     */
    initGame() {
        this.isGameRunning = false;
        this.score = 0;
        this.updateScore();

        this.setStartButtonEnabled(true);

        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }

        this.ensurePlatforms();
        this.placeLeftPlatform();
        this.placeRightPlatform();
        this.resetPlayerToLeft();
    }

    /**
     * 开始游戏
     */
    onStartGame() {
        this.isGameRunning = true;

        this.setStartButtonEnabled(false);

        this.ensurePlatforms();
        this.placeLeftPlatform();
        this.placeRightPlatform();
        this.resetPlayerToLeft();
    }

    /**
     * 确保平台存在
     */
    private ensurePlatforms() {
        if (!this.platformPrefab) {
            console.error('Platform prefab is not set');
            return;
        }

        if (!this.leftPlatform || !this.leftPlatform.isValid) {
            this.leftPlatform = instantiate(this.platformPrefab);
            this.leftPlatform.name = 'LeftPlatform';
            this.leftPlatform.setParent(this.node);
            this.setRandomPlatformColor(this.leftPlatform);
        }

        if (!this.rightPlatform || !this.rightPlatform.isValid) {
            this.rightPlatform = instantiate(this.platformPrefab);
            this.rightPlatform.name = 'RightPlatform';
            this.rightPlatform.setParent(this.node);
            this.setRandomPlatformColor(this.rightPlatform);
        }
    }

    /**
     * 玩家成功落在平台上
     */
    onPlayerLanded(platformNode: Node) {
        if (!this.isGameRunning) return;

        if (!this.rightPlatform || platformNode !== this.rightPlatform) return;

        this.score++;
        this.updateScore();
        this.resetPlayerToLeft();
        this.placeRightPlatform();
    }

    /**
     * 游戏结束
     */
    gameOver() {
        if (!this.isGameRunning) return;

        this.isGameRunning = false;

        if (this.gameOverPanel) {
            this.gameOverPanel.active = true;
        }

        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = `最终分数: ${this.score}`;
        }

        if (!this.gameOverPanel) {
            this.setStartButtonEnabled(true);
        }
    }

    /**
     * 更新分数显示
     */
    updateScore() {
        if (this.scoreLabel) {
            this.scoreLabel.string = `分数: ${this.score}`;
        }
    }

    /**
     * 重新开始游戏
     */
    onRestartGame() {
        this.initGame();
        this.onStartGame();
    }

    /**
     * 检查是否在游戏中
     */
    isPlaying(): boolean {
        return this.isGameRunning;
    }

    /**
     * 获取目标平台
     */
    getTargetPlatform(): Node {
        return this.rightPlatform;
    }

    private setupStartButton() {
        if (!this.startButton) return;
        const button = this.startButton.getComponent(Button);
        if (!button) {
            console.warn('Start button node missing Button component');
            return;
        }
        this.startButtonComponent = button;
        button.node.off(Button.EventType.CLICK, this.onRestartGame, this);
        button.node.on(Button.EventType.CLICK, this.onRestartGame, this);
    }

    private setStartButtonEnabled(enabled: boolean) {
        if (!this.startButton) return;
        const button = this.startButtonComponent || this.startButton.getComponent(Button);
        if (button) {
            button.interactable = enabled;
            button.enabled = enabled;
        }
        if (!this.scoreLabel || this.scoreLabel.node !== this.startButton) {
            this.startButton.active = enabled;
        } else {
            this.startButton.active = true;
        }
    }

    private placeLeftPlatform() {
        if (!this.leftPlatform) return;
        this.leftPlatform.setPosition(this.leftPlatformPos);
    }

    private placeRightPlatform() {
        if (!this.rightPlatform) return;
        const basePos = this.leftPlatform ? this.leftPlatform.position : this.leftPlatformPos;
        const minX = basePos.x + Math.max(this.minOffsetX, 0);
        const maxX = this.rightEdgeX;
        const range = maxX - minX;
        const minSeparation = this.getPlatformHalfWidth(this.leftPlatform) + this.getPlatformHalfWidth(this.rightPlatform) + this.platformGap;
        let targetX = basePos.x;

        if (range > 0) {
            let found = false;
            for (let i = 0; i < 12; i++) {
                const candidate = minX + Math.random() * range;
                if (Math.abs(candidate - basePos.x) >= minSeparation) {
                    targetX = candidate;
                    found = true;
                    break;
                }
            }

            if (!found) {
                const rightCandidate = basePos.x + minSeparation;
                const clampedRight = Math.min(Math.max(rightCandidate, minX), maxX);
                if (Math.abs(clampedRight - basePos.x) >= minSeparation) {
                    targetX = clampedRight;
                } else {
                    targetX = Math.min(Math.max(basePos.x, minX), maxX);
                }
            }
        }

        this.rightPlatform.setPosition(new Vec3(targetX, basePos.y, basePos.z));

        // 设置随机颜色
        this.setRandomPlatformColor(this.rightPlatform);
    }

    private resetPlayerToLeft() {
        if (!this.player) return;
        const basePos = this.leftPlatform ? this.leftPlatform.position : this.leftPlatformPos;
        this.player.setPosition(basePos.x, basePos.y + this.playerOffsetY, basePos.z);
        this.resetPlayerState();
    }

    private resetPlayerState() {
        if (!this.player) return;
        const controller = this.player.getComponent(PlayerController);
        if (controller) {
            controller.resetState();
        }
    }

    private getPlatformHalfWidth(platform: Node | null): number {
        if (!platform) return 0.5;
        const collider = platform.getComponent(BoxCollider);
        if (!collider) return Math.max(platform.scale.x, 1) * 0.5;
        return Math.max(collider.size.x * platform.scale.x, 0.1) * 0.5;
    }

    /**
     * 为平台设置随机颜色
     */
    private setRandomPlatformColor(platform: Node) {
        if (!platform || this.platformColors.length === 0) return;

        // 随机选择一个颜色
        const randomIndex = Math.floor(Math.random() * this.platformColors.length);
        const color = this.platformColors[randomIndex];

        // 查找平台的 MeshRenderer 组件
        const renderer = platform.getComponent(MeshRenderer);
        if (renderer && renderer.material) {
            // 设置材质的主颜色
            renderer.material.setProperty('mainColor', color);
        } else {
            // 如果平台节点本身没有 MeshRenderer，尝试在子节点中查找
            const childRenderer = platform.getComponentInChildren(MeshRenderer);
            if (childRenderer && childRenderer.material) {
                childRenderer.material.setProperty('mainColor', color);
            }
        }
    }
}
