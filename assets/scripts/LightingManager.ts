import { _decorator, Component, Node, DirectionalLight, Color, Vec3, Quat } from 'cc'
const { ccclass, property } = _decorator

/**
 * 光照管理器 - 实现三点布光系统
 *
 * 三点布光系统包括：
 * 1. 主光源（Key Light）- 主要照明，创造明确的阴影和高光
 * 2. 填充光（Fill Light）- 柔和的补光，减少阴影的强度
 * 3. 边缘光（Rim Light）- 轮廓光，强化边缘，增加立体感
 */
@ccclass('LightingManager')
export class LightingManager extends Component {
	@property(Node)
	mainLightNode: Node = null

	// 主光源参数
	@property({ type: Color, tooltip: '主光源颜色 - 温暖的白色' })
	keyLightColor: Color = new Color(255, 248, 235, 255) // #FFF8EB - 温暖白色

	@property({ tooltip: '主光源强度' })
	keyLightIntensity: number = 50000

	@property({ type: Vec3, tooltip: '主光源方向（欧拉角）' })
	keyLightRotation: Vec3 = new Vec3(-45, 45, 0)

	// 填充光参数
	@property({ type: Color, tooltip: '填充光颜色 - 柔和的蓝色' })
	fillLightColor: Color = new Color(173, 216, 230, 255) // #ADD8E6 - 浅蓝色

	@property({ tooltip: '填充光强度（较弱）' })
	fillLightIntensity: number = 20000

	@property({ type: Vec3, tooltip: '填充光方向（欧拉角）' })
	fillLightRotation: Vec3 = new Vec3(-30, -135, 0)

	// 边缘光参数
	@property({ type: Color, tooltip: '边缘光颜色 - 淡金色' })
	rimLightColor: Color = new Color(255, 245, 220, 255) // #FFF5DC - 淡金色

	@property({ tooltip: '边缘光强度（中等）' })
	rimLightIntensity: number = 30000

	@property({ type: Vec3, tooltip: '边缘光方向（欧拉角）' })
	rimLightRotation: Vec3 = new Vec3(-20, 180, 0)

	private fillLightNode: Node = null
	private rimLightNode: Node = null

	onLoad() {
		this.setupThreePointLighting()
	}

	/**
	 * 设置三点布光系统
	 */
	setupThreePointLighting() {
		// 设置主光源
		this.setupKeyLight()

		// 创建填充光
		this.setupFillLight()

		// 创建边缘光
		this.setupRimLight()

		console.log('三点布光系统已设置完成')
	}

	/**
	 * 设置主光源（Key Light）
	 */
	private setupKeyLight() {
		if (!this.mainLightNode) {
			console.warn('未指定主光源节点，尝试查找Main Light')
			this.mainLightNode = this.node.scene.getChildByName('Main Light')
		}

		if (this.mainLightNode) {
			const lightComp = this.mainLightNode.getComponent(DirectionalLight)
			if (lightComp) {
				// 设置颜色和强度
				lightComp.color = this.keyLightColor
				lightComp.illuminance = this.keyLightIntensity

				// 设置旋转（从前上方照射）
				const rotation = Quat.fromEuler(
					new Quat(),
					this.keyLightRotation.x,
					this.keyLightRotation.y,
					this.keyLightRotation.z,
				)
				this.mainLightNode.setRotation(rotation)

				console.log('主光源已配置')
			}
		}
	}

	/**
	 * 设置填充光（Fill Light）
	 */
	private setupFillLight() {
		// 创建填充光节点
		this.fillLightNode = new Node('Fill Light')
		this.node.scene.addChild(this.fillLightNode)

		// 添加方向光组件
		const lightComp = this.fillLightNode.addComponent(DirectionalLight)
		lightComp.color = this.fillLightColor
		lightComp.illuminance = this.fillLightIntensity

		// 设置旋转（从侧后方柔和照射）
		const rotation = Quat.fromEuler(
			new Quat(),
			this.fillLightRotation.x,
			this.fillLightRotation.y,
			this.fillLightRotation.z,
		)
		this.fillLightNode.setRotation(rotation)

		console.log('填充光已创建')
	}

	/**
	 * 设置边缘光（Rim Light）
	 */
	private setupRimLight() {
		// 创建边缘光节点
		this.rimLightNode = new Node('Rim Light')
		this.node.scene.addChild(this.rimLightNode)

		// 添加方向光组件
		const lightComp = this.rimLightNode.addComponent(DirectionalLight)
		lightComp.color = this.rimLightColor
		lightComp.illuminance = this.rimLightIntensity

		// 设置旋转（从背后照射，创造轮廓）
		const rotation = Quat.fromEuler(
			new Quat(),
			this.rimLightRotation.x,
			this.rimLightRotation.y,
			this.rimLightRotation.z,
		)
		this.rimLightNode.setRotation(rotation)

		console.log('边缘光已创建')
	}

	/**
	 * 动态调整光照强度（可用于日夜变化等效果）
	 */
	public adjustLightingIntensity(factor: number) {
		if (this.mainLightNode) {
			const lightComp = this.mainLightNode.getComponent(DirectionalLight)
			if (lightComp) {
				lightComp.illuminance = this.keyLightIntensity * factor
			}
		}

		if (this.fillLightNode) {
			const lightComp = this.fillLightNode.getComponent(DirectionalLight)
			if (lightComp) {
				lightComp.illuminance = this.fillLightIntensity * factor
			}
		}

		if (this.rimLightNode) {
			const lightComp = this.rimLightNode.getComponent(DirectionalLight)
			if (lightComp) {
				lightComp.illuminance = this.rimLightIntensity * factor
			}
		}
	}

	/**
	 * 切换填充光开关
	 */
	public toggleFillLight(enabled: boolean) {
		if (this.fillLightNode) {
			this.fillLightNode.active = enabled
		}
	}

	/**
	 * 切换边缘光开关
	 */
	public toggleRimLight(enabled: boolean) {
		if (this.rimLightNode) {
			this.rimLightNode.active = enabled
		}
	}
}
