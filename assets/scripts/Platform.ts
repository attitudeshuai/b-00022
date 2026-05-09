import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 平台组件
 * 用于标识平台节点
 */
@ccclass('Platform')
export class Platform extends Component {
    start() {
        // 平台初始化逻辑
    }
}
