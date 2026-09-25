# 空间折叠局 · 立体几何进阶挑战

一个可以直接发布到 GitHub Pages 的纯前端立体几何闯关游戏，无需安装任何依赖。

## 游戏内容

- 5 个进阶关卡，每关 5 题，共 25 题。
- 第 1 关：立方体展开图、对面、共顶点与折叠朝向。
- 第 2 关：由正方体表面三个点判断三角形至六边形截面。
- 第 3 关：不同方向的正投影轮廓与投影面积。
- 第 4 关：简单立方堆积、三角形密堆、四面体堆与空隙球。
- 第 5 关：线段、平面、球面与正方体表面上的动态轨迹。
- 作答后显示动态图形解析；正方体统一使用可见棱实线、隐藏棱虚线。
- 使用 Web Audio 在浏览器内合成背景音乐和反馈音效，无需音频素材。
- 支持手机与电脑浏览器。

## 本地试玩

直接双击 `index.html` 即可运行。

## 在 GitHub 网页端发布

1. 登录 GitHub，点击右上角 `+` → `New repository`。
2. 仓库名称建议填写 `cube-net-game`，可见性选择 `Public`，然后创建仓库。
3. 在新仓库中点击 `uploading an existing file`，把本项目解压后的全部文件上传并提交。
4. 打开仓库的 `Settings` → `Pages`。
5. 在 `Build and deployment` 的 `Source` 中选择 `GitHub Actions`。
6. 等待仓库顶部 `Actions` 页面中的部署任务显示绿色对勾。
7. 游戏地址通常为：`https://你的用户名.github.io/cube-net-game/`。

项目自带 `.github/workflows/pages.yml`，以后每次修改并提交 `main` 分支，网页都会自动重新部署。

## 项目结构

```text
cube-net-game/
├── .github/workflows/pages.yml   # GitHub Pages 自动部署
├── .nojekyll                     # 按静态网站原样发布
├── index.html                    # 页面结构
├── styles.css                    # 界面、动效与响应式样式
├── game.js                       # 25 道题、图形生成与游戏逻辑
└── README.md                     # 使用和发布说明
```
