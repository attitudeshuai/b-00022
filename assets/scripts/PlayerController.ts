import {
	_decorator,
	Animation,
	AnimationClip,
	assetManager,
	Component,
	Node,
	Vec3,
	RigidBody,
	input,
	Input,
	EventTouch,
	Collider,
	ICollisionEvent,
	MeshRenderer,
	BoxCollider,
	Prefab,
	SkeletalAnimation,
	Tween,
	tween,
	instantiate,
} from 'cc'
import { Platform } from './Platform'
const { ccclass, property } = _decorator

/**
 * 玩家控制器
 * 处理玩家的跳跃逻辑和碰撞检测
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
	@property(Node)
	gameManager: Node = null

	@property(Node)
	modelRoot: Node = null

	@property(Prefab)
	modelPrefab: Prefab = null

	@property
	modelPrefabUuid: string = ''

	@property
	idleClipName: string = 'Idle'

	@property
	chargeClipName: string = 'Idle'

	@property
	jumpClipName: string = 'Jumping Down'

	@property
	landClipName: string = 'Landing'

	@property(AnimationClip)
	idleClip: AnimationClip = null

	@property(AnimationClip)
	chargeClip: AnimationClip = null

	@property(AnimationClip)
	jumpClip: AnimationClip = null

	@property(AnimationClip)
	landClip: AnimationClip = null

	@property({ type: Vec3 })
	modelScale: Vec3 = new Vec3(0.3, 0.3, 0.3)

	@property({ type: Vec3 })
	modelOffset: Vec3 = new Vec3(0, 0, 0)

	@property
	facingYawOffset: number = 0

	@property
	animationSpeed: number = 0.4

	private rigidBody: RigidBody = null
	private isPressing: boolean = false
	private pressStartTime: number = 0
	private isJumping: boolean = false
	private canJump: boolean = true

	// 跳跃参数
	private readonly MAX_CHARGE_TIME: number = 2.6 // 最大蓄力时间（秒）
	private readonly MIN_JUMP_FORCE: number = 2.4 // 最小跳跃力度
	private readonly MAX_JUMP_FORCE: number = 14.0 // 最大跳跃力度
	private readonly JUMP_HEIGHT: number = 3 // 跳跃高度
	private readonly CHARGE_EASE: number = 1.8 // 蓄力曲线指数（越大初始越短）
	private readonly LANDING_EPS: number = 0.12 // 落地容错
	private readonly LANDING_GRACE_MS: number = 120 // 起跳后忽略落地时间
	private readonly LEAVE_PLATFORM_EPS: number = 0.02 // 判定离开平台的缓冲

	private modelBaseScale: Vec3 = new Vec3(1, 1, 1)
	private modelBasePos: Vec3 = new Vec3(0, 0, 0)

	private gameManagerScript: any = null
	private skeletalAnimation: SkeletalAnimation = null
	private animation: Animation = null
	private modelInstance: Node = null
	private loadingModelPrefab: boolean = false
	private facingYaw: number = 0
	private lockFacing: boolean = false
	private landingPending: boolean = false
	private pendingPlatform: Node | null = null
	private groundPlatform: Node | null = null
	private ignorePlatform: Node | null = null
	private ignorePlatformLeft: boolean = false
	private jumpStartTimeMs: number = 0
	private jumpVelocityX: number = 0
	private readonly zeroVec: Vec3 = new Vec3(0, 0, 0)
	private chargeAnimationTween: any = null // 蓄力动画 Tween

	start() {
		// 获取刚体组件
		this.rigidBody = this.getComponent(RigidBody)
		if (!this.rigidBody) {
			console.error('RigidBody component not found on player')
		}

		// 获取碰撞体组件并设置监听
		const collider = this.getComponent(Collider)
		if (collider) {
			collider.on('onCollisionEnter', this.onCollisionEnter, this)
			collider.on('onCollisionStay', this.onCollisionStay, this)
		}

		// 获取游戏管理器脚本
		if (this.gameManager) {
			this.gameManagerScript = this.gameManager.getComponent('GameManager')
		}

		this.setupModel()
		this.setupAnimation()
		this.playIdleAnim()
		this.faceTargetPlatform(true)

		// 注册触摸事件
		input.on(Input.EventType.TOUCH_START, this.onTouchStart, this)
		input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this)
		input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this)
	}

	onDestroy() {
		// 移除事件监听
		input.off(Input.EventType.TOUCH_START, this.onTouchStart, this)
		input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this)
		input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this)
		const collider = this.getComponent(Collider)
		if (collider) {
			collider.off('onCollisionEnter', this.onCollisionEnter, this)
			collider.off('onCollisionStay', this.onCollisionStay, this)
		}
	}

	resetState() {
		this.isPressing = false
		this.pressStartTime = 0
		this.isJumping = false
		this.canJump = true
		this.lockFacing = false
		this.cancelPendingLanding()
		this.groundPlatform = null
		this.ignorePlatform = null
		this.ignorePlatformLeft = false
		this.jumpStartTimeMs = 0
		this.jumpVelocityX = 0

		// 停止蓄力动画
		this.stopChargeAnimation()

		this.resetModelTransform()
		this.playIdleAnim()
		this.faceTargetPlatform(true)

		if (!this.rigidBody) {
			this.rigidBody = this.getComponent(RigidBody)
		}
		if (this.rigidBody) {
			this.rigidBody.setLinearVelocity(this.zeroVec)
			this.rigidBody.setAngularVelocity(this.zeroVec)
		}
	}

	update(_deltaTime: number) {
		if (!this.node) return
		this.enforceUpright()
		const nodePos = this.node.position
		if (!nodePos) return

		// 更新蓄力动画强度
		if (this.isPressing && this.modelRoot) {
			this.updateChargeAnimation()
		}

		// 检测是否掉落
		if (nodePos.y < -10) {
			this.onFall()
		}

		if (this.ignorePlatform && !this.ignorePlatformLeft) {
			const platformCollider = this.ignorePlatform.getComponent(BoxCollider)
			const playerCollider = this.getComponent(BoxCollider)
			if (platformCollider && playerCollider) {
				const platformTop = this.getColliderWorldTop(this.ignorePlatform, platformCollider)
				const playerBottom = this.getColliderWorldBottom(this.node, playerCollider)
				if (playerBottom > platformTop + this.LEAVE_PLATFORM_EPS) {
					this.ignorePlatformLeft = true
				}
			} else if (Date.now() - this.jumpStartTimeMs > this.LANDING_GRACE_MS) {
				this.ignorePlatformLeft = true
			}
		}

		// 检测是否正在跳跃过程中
		if (this.isJumping && this.rigidBody) {
			const velocity = this.rigidBody.linearVelocity
			if (!velocity) return
			if (Math.abs(this.jumpVelocityX) > 0.001 && Math.abs(velocity.x) < 0.01) {
				this.rigidBody.setLinearVelocity(new Vec3(this.jumpVelocityX, velocity.y, velocity.z))
			}
			// 当垂直速度接近0且位置稳定时，认为跳跃结束
			if (Math.abs(velocity.y) < 0.1 && nodePos.y < 1) {
				this.isJumping = false
			}
		}
	}

	/**
	 * 触摸开始
	 */
	onTouchStart(_event: EventTouch) {
		if (!this.canJump || this.isJumping) return
		if (!this.gameManagerScript || !this.gameManagerScript.isPlaying()) return

		this.faceTargetPlatform(true)
		this.isPressing = true
		this.pressStartTime = Date.now()
		this.playChargeAnim()
	}

	/**
	 * 触摸结束
	 */
	onTouchEnd(_event: EventTouch) {
		if (!this.isPressing) return

		this.isPressing = false

		// 停止蓄力动画
		this.stopChargeAnimation()

		if (!this.gameManagerScript || !this.gameManagerScript.isPlaying()) return

		// 计算蓄力时间
		const pressDuration = (Date.now() - this.pressStartTime) / 1000
		const chargeRatio = Math.min(pressDuration / this.MAX_CHARGE_TIME, 1.0)

		// 执行跳跃
		this.jump(chargeRatio)
	}

	/**
	 * 跳跃
	 * @param chargeRatio 蓄力比例 (0-1)
	 */
	jump(chargeRatio: number) {
		if (!this.rigidBody || this.isJumping) return

		this.isJumping = true
		this.canJump = false
		this.lockFacing = true
		this.ignorePlatform = this.groundPlatform
		this.ignorePlatformLeft = false
		this.jumpStartTimeMs = Date.now()
		this.groundPlatform = null

		// 计算跳跃力度（水平方向）
		const easedCharge = Math.pow(chargeRatio, this.CHARGE_EASE)
		const jumpForce = this.MIN_JUMP_FORCE + (this.MAX_JUMP_FORCE - this.MIN_JUMP_FORCE) * easedCharge
		const directionSign = this.getJumpDirectionSign()
		this.jumpVelocityX = jumpForce * directionSign

		// 设置速度（向右跳跃）
		this.rigidBody.wakeUp()
		this.rigidBody.linearFactor = new Vec3(1, 1, 1)
		const jumpVelocity = new Vec3(this.jumpVelocityX, this.JUMP_HEIGHT, 0)
		this.rigidBody.setLinearVelocity(jumpVelocity)
		this.playJumpAnim()
	}

	/**
	 * 碰撞检测
	 */
	onCollisionEnter(event: ICollisionEvent) {
		const otherNode = event.otherCollider.node

		// 检测是否碰到平台
		if (otherNode.getComponent(Platform)) {
			if (this.canJump) {
				this.groundPlatform = otherNode
			}
			this.tryLandPlatform(otherNode, event)
		}
	}

	onCollisionStay(event: ICollisionEvent) {
		const otherNode = event.otherCollider.node

		if (otherNode.getComponent(Platform)) {
			if (this.canJump) {
				this.groundPlatform = otherNode
			}
			this.tryLandPlatform(otherNode, event)
		}
	}

	/**
	 * 落在平台上
	 */
	onLandPlatform(platform: Node) {
		if (this.canJump) return
		if (this.landingPending) return

		this.isJumping = false
		this.canJump = false
		this.lockFacing = false
		this.groundPlatform = platform
		this.ignorePlatform = null
		this.ignorePlatformLeft = false
		this.jumpStartTimeMs = 0
		this.jumpVelocityX = 0
		this.settleOnPlatform(platform)
		this.playLandAnim()
		this.landingPending = true
		this.pendingPlatform = platform
		this.unschedule(this.commitLandingScore)
		const delay = this.getClipDuration(this.landClipName, 0.2)
		this.scheduleOnce(this.commitLandingScore, delay)
	}

	/**
	 * 掉落
	 */
	onFall() {
		this.lockFacing = false
		this.cancelPendingLanding()
		this.groundPlatform = null
		this.ignorePlatform = null
		this.ignorePlatformLeft = false
		this.jumpStartTimeMs = 0
		this.jumpVelocityX = 0
		if (this.gameManagerScript) {
			this.gameManagerScript.gameOver()
		}
	}

	private setupModel() {
		this.spawnModelFromPrefab()
		if (!this.modelRoot || !this.modelRoot.isValid || !this.modelRoot.activeInHierarchy) {
			const candidate = this.node.getChildByName('Model')
			if (candidate && candidate.activeInHierarchy) {
				this.modelRoot = candidate
			} else {
				const skeletal = this.node.getComponentInChildren(SkeletalAnimation)
				const generic = this.node.getComponentInChildren(Animation)
				if (skeletal && skeletal.node.activeInHierarchy) {
					this.modelRoot = skeletal.node
				} else if (generic && generic.node.activeInHierarchy) {
					this.modelRoot = generic.node
				} else {
					this.modelRoot = this.node
				}
			}
		}
		const rootRenderer = this.getComponent(MeshRenderer)
		if (rootRenderer) {
			rootRenderer.enabled = this.modelRoot === this.node
		}
		Vec3.copy(this.modelBaseScale, this.modelRoot.scale)
		Vec3.copy(this.modelBasePos, this.modelRoot.position)
	}

	private setupAnimation() {
		if (!this.modelRoot) return
		this.skeletalAnimation =
			this.modelRoot.getComponent(SkeletalAnimation) || this.modelRoot.getComponentInChildren(SkeletalAnimation)
		this.animation = this.modelRoot.getComponent(Animation) || this.modelRoot.getComponentInChildren(Animation)
		this.assignClips()
	}

	private tryLandPlatform(platform: Node, event?: ICollisionEvent) {
		if (this.canJump) return
		if (Date.now() - this.jumpStartTimeMs < this.LANDING_GRACE_MS) return
		if (this.ignorePlatform && platform === this.ignorePlatform && !this.ignorePlatformLeft) return
		if (!this.isLandingOnPlatform(platform, event)) return
		this.onLandPlatform(platform)
	}

	private isLandingOnPlatform(platform: Node, event?: ICollisionEvent): boolean {
		const contacts = (event as any)?.contacts
		if (contacts && contacts.length) {
			for (const contact of contacts) {
				const normal = contact?.normal
				if (normal && normal.y > 0.3) {
					return true
				}
			}
		}

		const platformCollider = platform.getComponent(BoxCollider)
		const playerCollider = this.getComponent(BoxCollider)
		if (!platformCollider || !playerCollider) {
			return this.node.worldPosition.y >= platform.worldPosition.y
		}

		const platformTop = this.getColliderWorldTop(platform, platformCollider)
		const playerBottom = this.getColliderWorldBottom(this.node, playerCollider)
		return playerBottom >= platformTop - this.LANDING_EPS
	}

	private settleOnPlatform(platform: Node) {
		if (this.rigidBody) {
			this.rigidBody.setLinearVelocity(this.zeroVec)
			this.rigidBody.setAngularVelocity(this.zeroVec)
		}
		const platformCollider = platform.getComponent(BoxCollider)
		const playerCollider = this.getComponent(BoxCollider)
		if (!platformCollider || !playerCollider) return
		const platformTop = this.getColliderWorldTop(platform, platformCollider)
		const playerBottomOffset = this.getColliderWorldBottomOffset(this.node, playerCollider)
		const worldPos = this.node.worldPosition
		this.node.setWorldPosition(worldPos.x, platformTop - playerBottomOffset, worldPos.z)
	}

	private getColliderWorldCenterY(node: Node, collider: BoxCollider): number {
		const scaleY = node.worldScale ? node.worldScale.y : node.scale.y
		return node.worldPosition.y + collider.center.y * scaleY
	}

	private getColliderWorldHalfY(node: Node, collider: BoxCollider): number {
		const scaleY = node.worldScale ? node.worldScale.y : node.scale.y
		return collider.size.y * scaleY * 0.5
	}

	private getColliderWorldTop(node: Node, collider: BoxCollider): number {
		return this.getColliderWorldCenterY(node, collider) + this.getColliderWorldHalfY(node, collider)
	}

	private getColliderWorldBottom(node: Node, collider: BoxCollider): number {
		return this.getColliderWorldCenterY(node, collider) - this.getColliderWorldHalfY(node, collider)
	}

	private getColliderWorldBottomOffset(node: Node, collider: BoxCollider): number {
		const scaleY = node.worldScale ? node.worldScale.y : node.scale.y
		return (collider.center.y - collider.size.y * 0.5) * scaleY
	}

	private resetModelTransform() {
		if (!this.modelRoot) return
		this.stopChargeAnimation()
		Tween.stopAllByTarget(this.modelRoot)
		this.modelRoot.setScale(this.modelBaseScale)
		if (this.modelRoot !== this.node) {
			this.modelRoot.setPosition(this.modelBasePos)
		}
	}

	private playChargeAnim() {
		this.unschedule(this.playIdleAnim)
		if (this.playClipFromAsset(this.chargeClip, true) || this.playClip(this.chargeClipName, true)) return
		if (!this.modelRoot) return

		// 停止之前的蓄力动画
		this.stopChargeAnimation()

		// 开始持续的蓄力呼吸动画
		this.startChargeBreathingAnimation()
	}

	/**
	 * 停止蓄力动画
	 */
	private stopChargeAnimation() {
		if (this.chargeAnimationTween) {
			this.chargeAnimationTween.stop()
			this.chargeAnimationTween = null
		}
		Tween.stopAllByTarget(this.modelRoot)
	}

	/**
	 * 开始蓄力呼吸动画（持续循环）
	 */
	private startChargeBreathingAnimation() {
		if (!this.modelRoot) return

		// 初始压缩动画
		const initialScale = new Vec3(
			this.modelBaseScale.x * 1.05,
			this.modelBaseScale.y * 0.92,
			this.modelBaseScale.z * 1.05,
		)

		if (this.modelRoot === this.node) {
			// 如果模型就是节点本身
			this.chargeAnimationTween = tween(this.modelRoot)
				.to(0.15, { scale: initialScale }, { easing: 'sineOut' })
				.call(() => {
					// 开始循环的呼吸动画
					this.loopChargeBreathing()
				})
				.start()
		} else {
			// 如果模型是子节点
			const initialPos = new Vec3(this.modelBasePos.x, this.modelBasePos.y - 0.03, this.modelBasePos.z)
			this.chargeAnimationTween = tween(this.modelRoot)
				.to(0.15, { scale: initialScale, position: initialPos }, { easing: 'sineOut' })
				.call(() => {
					this.loopChargeBreathing()
				})
				.start()
		}
	}

	/**
	 * 循环的蓄力呼吸动画
	 */
	private loopChargeBreathing() {
		if (!this.modelRoot || !this.isPressing) return

		// 根据蓄力时间计算动画强度
		const pressDuration = (Date.now() - this.pressStartTime) / 1000
		const chargeRatio = Math.min(pressDuration / this.MAX_CHARGE_TIME, 1.0)

		// 随着蓄力增加，压缩程度也增加
		const scaleMultiplier = 1.0 + chargeRatio * 0.08 // 从1.05到1.13
		const squashMultiplier = 0.92 - chargeRatio * 0.07 // 从0.92到0.85

		const breatheScale1 = new Vec3(
			this.modelBaseScale.x * scaleMultiplier,
			this.modelBaseScale.y * squashMultiplier,
			this.modelBaseScale.z * scaleMultiplier,
		)

		const breatheScale2 = new Vec3(
			this.modelBaseScale.x * (scaleMultiplier + 0.02),
			this.modelBaseScale.y * (squashMultiplier - 0.02),
			this.modelBaseScale.z * (scaleMultiplier + 0.02),
		)

		if (this.modelRoot === this.node) {
			this.chargeAnimationTween = tween(this.modelRoot)
				.to(0.3, { scale: breatheScale2 }, { easing: 'sineInOut' })
				.to(0.3, { scale: breatheScale1 }, { easing: 'sineInOut' })
				.call(() => {
					// 继续循环
					this.loopChargeBreathing()
				})
				.start()
		} else {
			const breathePos1 = new Vec3(
				this.modelBasePos.x,
				this.modelBasePos.y - 0.03 - chargeRatio * 0.03,
				this.modelBasePos.z,
			)
			const breathePos2 = new Vec3(
				this.modelBasePos.x,
				this.modelBasePos.y - 0.04 - chargeRatio * 0.03,
				this.modelBasePos.z,
			)

			this.chargeAnimationTween = tween(this.modelRoot)
				.to(0.3, { scale: breatheScale2, position: breathePos2 }, { easing: 'sineInOut' })
				.to(0.3, { scale: breatheScale1, position: breathePos1 }, { easing: 'sineInOut' })
				.call(() => {
					this.loopChargeBreathing()
				})
				.start()
		}
	}

	/**
	 * 更新蓄力动画（每帧调用以更新动画强度）
	 */
	private updateChargeAnimation() {
		// 动画强度在 loopChargeBreathing 中自动更新
		// 这个方法保留用于未来可能的实时调整
	}

	private playJumpAnim() {
		this.unschedule(this.playIdleAnim)
		if (this.playClipFromAsset(this.jumpClip, false) || this.playClip(this.jumpClipName, false)) return
		if (!this.modelRoot) return
		Tween.stopAllByTarget(this.modelRoot)
		const scale = new Vec3(this.modelBaseScale.x * 0.9, this.modelBaseScale.y * 1.12, this.modelBaseScale.z * 0.9)
		const baseScale = new Vec3(this.modelBaseScale.x, this.modelBaseScale.y, this.modelBaseScale.z)
		if (this.modelRoot === this.node) {
			tween(this.modelRoot)
				.to(0.08, { scale }, { easing: 'quadOut' })
				.to(0.12, { scale: baseScale }, { easing: 'quadIn' })
				.start()
			return
		}
		const pos = new Vec3(this.modelBasePos.x, this.modelBasePos.y + 0.06, this.modelBasePos.z)
		const basePos = new Vec3(this.modelBasePos.x, this.modelBasePos.y, this.modelBasePos.z)
		tween(this.modelRoot)
			.to(0.08, { scale, position: pos }, { easing: 'quadOut' })
			.to(0.12, { scale: baseScale, position: basePos }, { easing: 'quadIn' })
			.start()
	}

	private playLandAnim() {
		if (this.playClipFromAsset(this.landClip, false) || this.playClip(this.landClipName, false)) {
			this.scheduleIdleFromClip(this.landClipName, 0.2)
			return
		}
		if (!this.modelRoot) return
		Tween.stopAllByTarget(this.modelRoot)
		const scale = new Vec3(this.modelBaseScale.x * 1.1, this.modelBaseScale.y * 0.85, this.modelBaseScale.z * 1.1)
		const baseScale = new Vec3(this.modelBaseScale.x, this.modelBaseScale.y, this.modelBaseScale.z)
		if (this.modelRoot === this.node) {
			tween(this.modelRoot)
				.to(0.08, { scale }, { easing: 'quadOut' })
				.to(0.12, { scale: baseScale }, { easing: 'quadIn' })
				.start()
			return
		}
		const pos = new Vec3(this.modelBasePos.x, this.modelBasePos.y - 0.04, this.modelBasePos.z)
		const basePos = new Vec3(this.modelBasePos.x, this.modelBasePos.y, this.modelBasePos.z)
		tween(this.modelRoot)
			.to(0.08, { scale, position: pos }, { easing: 'quadOut' })
			.to(0.12, { scale: baseScale, position: basePos }, { easing: 'quadIn' })
			.start()
	}

	private playIdleAnim() {
		if (!this.playClipFromAsset(this.idleClip, true)) {
			this.playClip(this.idleClipName, true)
		}
	}

	private getAnimationComponent(): Animation | SkeletalAnimation | null {
		if (this.skeletalAnimation) return this.skeletalAnimation
		if (this.animation) return this.animation
		return null
	}

	private resolveClipName(target: string): string | null {
		const trimmed = target ? target.trim() : ''
		if (!trimmed) return null
		const anim = this.getAnimationComponent()
		const clips = anim ? anim.clips : null
		if (!clips || !clips.length) return trimmed
		const exact = clips.find((clip) => clip.name === trimmed)
		if (exact) return exact.name
		const prefix = clips.find((clip) => clip.name.startsWith(trimmed))
		if (prefix) return prefix.name
		const fuzzy = clips.find((clip) => clip.name.toLowerCase().includes(trimmed.toLowerCase()))
		return fuzzy ? fuzzy.name : trimmed
	}

	private playClip(name: string, loop: boolean): boolean {
		const clipName = this.resolveClipName(name)
		if (!clipName) return false
		const anim = this.getAnimationComponent()
		if (!anim) return false
		const state = anim.getState(clipName)
		if (state) {
			state.wrapMode = loop ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal
			state.speed = this.animationSpeed
		}
		anim.play(clipName)
		return true
	}

	private playClipFromAsset(clip: AnimationClip | null, loop: boolean): boolean {
		if (!clip) return false
		const anim = this.getAnimationComponent()
		if (!anim) return false
		const state = anim.getState(clip.name)
		if (state) {
			state.wrapMode = loop ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal
			state.speed = this.animationSpeed
		}
		anim.play(clip.name)
		return true
	}

	private scheduleIdleFromClip(name: string, fallbackDelay: number) {
		const clipName = this.resolveClipName(name)
		const anim = this.getAnimationComponent()
		const state = clipName && anim ? anim.getState(clipName) : null
		const speed = this.animationSpeed > 0 ? this.animationSpeed : 1
		const delay = state ? Math.max(state.duration / speed, 0.05) : fallbackDelay
		this.unschedule(this.playIdleAnim)
		this.scheduleOnce(this.playIdleAnim, delay)
	}

	private getClipDuration(name: string, fallbackDelay: number): number {
		const clipName = this.resolveClipName(name)
		const anim = this.getAnimationComponent()
		const state = clipName && anim ? anim.getState(clipName) : null
		const speed = this.animationSpeed > 0 ? this.animationSpeed : 1
		return state ? Math.max(state.duration / speed, 0.05) : fallbackDelay
	}

	private commitLandingScore() {
		if (!this.landingPending) return
		const platform = this.pendingPlatform
		this.landingPending = false
		this.pendingPlatform = null
		if (!platform || !platform.isValid) {
			this.canJump = true
			return
		}
		if (this.gameManagerScript) {
			this.gameManagerScript.onPlayerLanded(platform)
		} else {
			this.canJump = true
		}
	}

	private cancelPendingLanding() {
		this.landingPending = false
		this.pendingPlatform = null
		this.unschedule(this.commitLandingScore)
	}

	private spawnModelFromPrefab() {
		const existing = this.node.getComponentInChildren(SkeletalAnimation)
		if (existing && existing.node !== this.node) {
			this.modelRoot = existing.node
			return
		}

		if (!this.modelPrefab) {
			this.loadModelPrefabByUuid()
			return
		}
		const legacyModel = this.node.getChildByName('Model')
		if (legacyModel) {
			legacyModel.active = false
		}
		if (this.modelInstance && this.modelInstance.isValid) {
			this.modelInstance.destroy()
		}
		const instance = instantiate(this.modelPrefab)
		this.attachModelInstance(instance)
	}

	private applyLayer(node: Node, layer: number) {
		node.layer = layer
		for (const child of node.children) {
			this.applyLayer(child, layer)
		}
	}

	private attachModelInstance(instance: Node) {
		if (!instance || !this.node || !this.node.isValid) return
		instance.name = 'PlayerModel'
		instance.active = true
		instance.setParent(this.node)
		instance.setPosition(this.modelOffset)
		instance.setScale(this.modelScale)
		this.applyLayer(instance, this.node.layer)
		this.modelInstance = instance
		this.modelRoot = instance
		Vec3.copy(this.modelBaseScale, instance.scale)
		Vec3.copy(this.modelBasePos, instance.position)
		this.setupAnimation()
		this.playIdleAnim()
		const rootRenderer = this.getComponent(MeshRenderer)
		if (rootRenderer) {
			rootRenderer.enabled = false
		}
	}

	private loadModelPrefabByUuid() {
		const uuid = this.modelPrefabUuid ? this.modelPrefabUuid.trim() : ''
		if (!uuid || this.loadingModelPrefab) return
		this.loadingModelPrefab = true
		assetManager.loadAny({ uuid }, (err, asset) => {
			this.loadingModelPrefab = false
			if (err) {
				console.warn(`Failed to load model prefab uuid: ${uuid}`, err)
				return
			}
			if (asset instanceof Prefab) {
				const instance = instantiate(asset)
				this.attachModelInstance(instance)
				return
			}
			if (asset instanceof Node) {
				this.attachModelInstance(asset)
				return
			}
			console.warn(`Loaded asset is not a Prefab or Node for uuid: ${uuid}`)
		})
	}

	private assignClips() {
		const anim = this.getAnimationComponent()
		if (!anim) return
		;(anim as Animation).playOnLoad = false
		this.renameClip(this.idleClip, this.idleClipName)
		this.renameClip(this.chargeClip, this.chargeClipName)
		this.renameClip(this.jumpClip, this.jumpClipName)
		this.renameClip(this.landClip, this.landClipName)
		const uniqueClips: AnimationClip[] = []
		const seen = new Set<AnimationClip>()
		for (const clip of [this.idleClip, this.chargeClip, this.jumpClip, this.landClip]) {
			if (clip && !seen.has(clip)) {
				seen.add(clip)
				uniqueClips.push(clip)
			}
		}
		if (!uniqueClips.length) return
		;(anim as Animation).clips = uniqueClips
		if (this.idleClip) {
			;(anim as Animation).defaultClip = this.idleClip
		}
	}

	private renameClip(clip: AnimationClip | null, name: string) {
		if (!clip) return
		const nextName = name ? name.trim() : ''
		if (!nextName) return
		if (clip.name !== nextName) {
			clip.name = nextName
		}
	}

	private getTargetPlatformNode(): Node | null {
		if (!this.gameManagerScript || !this.gameManagerScript.getTargetPlatform) return null
		const target = this.gameManagerScript.getTargetPlatform()
		if (!target || !target.isValid) return null
		return target
	}

	private getJumpDirectionSign(): number {
		const target = this.getTargetPlatformNode()
		if (!target || !this.node) return 1
		const playerPos = this.node.worldPosition
		const targetPos = target.worldPosition
		const dx = targetPos.x - playerPos.x
		if (Math.abs(dx) < 0.001) return 1
		return dx >= 0 ? 1 : -1
	}

	private faceTargetPlatform(applyNow: boolean) {
		if (!this.node) return
		const target = this.getTargetPlatformNode()
		if (target) {
			const playerPos = this.node.worldPosition
			const targetPos = target.worldPosition
			const dx = targetPos.x - playerPos.x
			const dz = targetPos.z - playerPos.z
			const lenSq = dx * dx + dz * dz
			if (lenSq > 0.0001) {
				const yaw = Math.atan2(dx, dz) * (180 / Math.PI)
				this.facingYaw = yaw + this.facingYawOffset
			}
		}
		if (applyNow) {
			this.node.setRotationFromEuler(0, this.facingYaw, 0)
		}
	}

	private enforceUpright() {
		if (!this.node) return
		if (!this.lockFacing) {
			this.faceTargetPlatform(false)
		}
		this.node.setRotationFromEuler(0, this.facingYaw, 0)
		if (this.rigidBody) {
			this.rigidBody.setAngularVelocity(this.zeroVec)
		}
	}
}
