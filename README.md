# Jump Game (Cocos Creator)

## 📝 项目需求 (Requirements)

> **原始需求 Prompt**:
> "这是一个cocos creater3.8.8的游戏项目
> 编程语言：typescript
> 游戏内容：
> 核心玩法：跳一跳
> 界面：开始按钮，分数显示
> 操作：点击屏幕，根据按下时长蓄力，蓄力越久跳得越远
>
> 具体玩法：点击开始按钮后，生成2个平台，平台之间距离随机，人物初始在平台1上面。点击屏幕，根据按下时长蓄力，蓄力越久跳得越远。落入下一个平台得1分，没落入下一个平台游戏失败。"

## 🛠 技术栈

- Frontend: Cocos Creator 3.8.8 + TypeScript
- Backend: Nginx (Dockerized Static Hosting)
- Infrastructure: Docker + Docker Compose

## 🚀 启动指南 (How to Run)

1. 确保 Docker Desktop 已启动。
2. 在项目根目录执行：`docker compose up`
3. 等待容器启动完成...

## 🔗 服务地址 (Services)

- Game Frontend: <http://localhost:3000>

## 🧪 测试说明

- 本项目为纯前端游戏，无后台登录账号。
- 直接访问上述地址即可开始游戏。

## 📂 目录结构 (Directory Structure)

```text
jump-game/
├── assets/                 # 游戏资源目录
│   ├── scenes/            # 游戏场景 (.scene)
│   ├── scripts/           # TypeScript 脚本代码
│   │   ├── GameManager.ts    # 游戏核心逻辑
│   │   ├── LightingManager.ts # 灯光控制
│   │   └── PlayerController.ts # 玩家控制
│   └── ...
├── build/
│   └── web-desktop/       # Cocos Creator 构建输出 (HTML5)
├── profiles/               # 构建配置文件
├── Dockerfile              # 容器构建说明
├── docker-compose.yml      # 容器编排
├── nginx.conf              # Web 服务器配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目入口文档
```

## 🛠 技术实现细节

### 1. Docker 容器化方案

- **基础镜像**: `nginx:alpine`
- **构建策略**: 直接将 Cocos Creator 的构建产物 (`build/web-desktop`) 复制到 Nginx 容器内的 `/usr/share/nginx/html`。
- **缓存处理**: 为避免 Docker 构建缓存旧的构建产物，建议使用 `--no-cache` 参数重建：

  ```bash
  docker compose build --no-cache
  ```

### 2. Nginx 配置优化

由于 Cocos Creator 3.x 使用了 WebAssembly 和 JSON 模块，标准的 Nginx 配置可能会导致 MIME 类型错误。

- **MIME Types**: 显式添加了 `.wasm` 支持：

  ```nginx
  include /etc/nginx/mime.types;
  types {
      application/wasm wasm;
  }
  ```

- **缓存控制**: 开发环境禁用了浏览器缓存，确保加载最新代码：

  ```nginx
  add_header Cache-Control "no-cache, no-store, must-revalidate";
  ```

### 3. Cocos Creator & TypeScript 避坑指南

#### 装饰器与属性序列化

- **问题**: 在 Docker/Web 运行时可能出现 `Cannot set properties of undefined`。
- **原因**: TypeScript 编译配置与 Cocos 装饰器不兼容，导致属性未正确初始化。
- **解决方案**:
  1. 在 `tsconfig.json` 中设置 `"useDefineForClassFields": false`。
  2. 在 `@property` 装饰器中显式指定类型，特别是值类型（Vec3, Color）：

     ```typescript
     @property({ type: Vec3 })
     someVector: Vec3 = new Vec3();
     ```

#### 启动场景配置

- 确保 `settings.json` (或通过构建面板) 中的 `launchScene` 指向主游戏场景 (`db://assets/scenes/GameScene.scene`)，而非默认的空场景。

### 4. SystemJS 模块加载

- 在 `index.html` 中需要确保包含 SystemJS 的 import map 和 bundle 引用，以支持模块化加载。
