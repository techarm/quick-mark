# QuickMark

[![Release](https://img.shields.io/github/v/release/techarm/quick-mark?style=flat-square)](https://github.com/techarm/quick-mark/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/techarm/quick-mark/release.yml?style=flat-square&label=build)](https://github.com/techarm/quick-mark/actions)
[![License](https://img.shields.io/github/license/techarm/quick-mark?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)]()

[English](README.md)

Tauri、React、TypeScript で構築された、高速でクロスプラットフォームなブックマーク & 認証情報マネージャーです。

## 機能

- **リンク管理** — ブックマークの保存・整理・検索。メタデータとファビコンを自動取得
- **スマートフォルダ** — すべてのリンク、最近追加、一時リンク、期限切れ、ピン留め、認証情報のプリセットフィルタ
- **カテゴリ** — カスタムカラー付きの階層フォルダでリンクを整理
- **一時リンク** — 有効期限を設定して自動クリーンアップ
- **認証情報の保存** — ユーザー名とパスワードをワンクリックでコピー、30秒後に自動クリア
- **コマンドパレット** — `Cmd+Shift+Space` / `Ctrl+Shift+Space` でグローバル検索
- **ブラウザ拡張機能** — Chrome/Edge 拡張機能で任意のWebページから素早く保存
- **インポート/エクスポート** — ブラウザのブックマーク（HTML）や JSON バックアップからインポート、ライブラリ全体をエクスポート
- **一括操作** — 複数リンクを選択して移動・削除
- **ダーク/ライトテーマ** — テーマ切替と設定の永続化
- **クロスプラットフォーム** — macOS（Apple Silicon & Intel）と Windows のネイティブビルド

## 技術スタック

- **フロントエンド**: React 19, TypeScript, Tailwind CSS, Radix UI, Zustand
- **バックエンド**: Rust, Tauri v2, SQLite
- **ビルド**: Vite, Biome

## はじめに

### 前提条件

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

### 開発

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun tauri dev
```

### ビルド

```bash
# 現在のプラットフォーム向けにビルド
bun tauri build
```

## キーボードショートカット

| ショートカット | アクション |
|---|---|
| `Cmd/Ctrl+Shift+Space` | 検索パレットの切替 |
| `Cmd/Ctrl+Shift+A` | 新しいリンクを追加 |
| `Cmd/Ctrl+K` | 検索にフォーカス |
| `Cmd/Ctrl+A` | すべてのリンクを選択 |
| `Escape` | 選択解除 / 閉じる |

## コントリビュート

バグ報告や機能リクエストは [GitHub Issues](https://github.com/techarm/quick-mark/issues) からお願いします。

プルリクエストも歓迎です。大きな変更の場合は、まず Issue を作成してご相談ください。

## ライセンス

[MIT](LICENSE)
