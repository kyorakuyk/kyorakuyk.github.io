# kyorakuyk.github.io

独立的 GitHub Pages 写作站点。这个仓库使用 Jekyll + Markdown，与另一个Astro 项目分开维护。

## 结构

- `index.html`：博客首页和最近文章
- `_posts/`：已发布文章
- `_drafts/`：不会默认发布的草稿与模板
- `_layouts/`：页面和文章布局
- `assets/css/site.css`：站点样式
- `about.md`：关于页面

## 发布文章

新建 `_posts/YYYY-MM-DD-title.md`，添加 front matter：

```yaml
---
title: 文章标题
description: 一句话摘要。
date: 2026-01-01
tags:
  - engineering
---
```

未完成内容放进 `_drafts/`，不会被 GitHub Pages 默认发布。公开前检查文章中的身份信息、邮箱、私有项目和内部路径。

## GitHub Pages

将仓库命名为 `kyorakuyk.github.io`，然后在 GitHub 的 `Settings → Pages` 中选择 `Deploy from a branch`、`main` 和根目录 `/`。GitHub Pages 会使用 Jekyll 构建这个站点。

## 本地预览

本机安装 Ruby 和 Bundler 后运行：

```bash
bundle install
bundle exec jekyll serve
```

当前开发环境没有安装 Ruby，因此本地 Jekyll 构建需要在安装 Ruby 后再验证；仓库结构遵循 GitHub Pages 的 Jekyll 约定。
