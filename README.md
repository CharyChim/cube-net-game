# 立方体展开图 · 逐级空间挑战

一个可以直接发布到 GitHub Pages 的纯前端小游戏，无需安装任何依赖。

## 游戏内容

- 共 15 关，难度逐步增加。
- 第 1–3 关：判断相对面。
- 第 4–6 关：判断三个面能否在同一顶点相交。
- 第 7–9 关：找出三组相对面。
- 第 10–12 关：根据立方体棱的剪开情况选择正确展开图。
- 第 13–15 关：复杂剪棱题，增加干扰项，并减少折痕提示。
- 展开图会随机旋转、翻转，数字与题目也会随机变化。
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
├── index.html                    # 游戏页面与全部逻辑
└── README.md                     # 使用和发布说明
```
