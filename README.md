# QuickMark

[![Release](https://img.shields.io/github/v/release/techarm/quick-mark?style=flat-square)](https://github.com/techarm/quick-mark/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/techarm/quick-mark/release.yml?style=flat-square&label=build)](https://github.com/techarm/quick-mark/actions)
[![License](https://img.shields.io/github/license/techarm/quick-mark?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)]()

高速でクロスプラットフォームなブックマーク & 認証情報マネージャー。

---

## ダウンロード

[Releases ページ](https://github.com/techarm/quick-mark/releases) から最新版をダウンロードできます。

| プラットフォーム | ファイル |
|--------------|---------|
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Windows | `.exe` |

アプリ内から新しいバージョンを自動検知し、ワンクリックでアップデートできます。

---

## 主な機能

### ブックマーク管理

| 機能 | 説明 |
|------|------|
| リンク管理 | ブックマークの保存・整理・検索。メタデータとファビコンを自動取得 |
| ワークスペース | 仕事・プライベートなど用途別にデータを完全に分離 |
| スマートフォルダ | すべて / 最近追加 / 一時リンク / 期限切れ / ピン留めのプリセットフィルタ |
| カテゴリ | カスタムカラー付きの階層フォルダで整理 |
| 一時リンク | 有効期限を設定して自動クリーンアップ |
| 一括操作 | 複数リンクを選択して移動・削除 |

### 認証情報

| 機能 | 説明 |
|------|------|
| パスワード保存 | ワークスペースごとに独立管理 |
| ワンクリックコピー | ユーザー名・パスワードをすぐにコピー |
| 自動クリア | コピーから30秒後にクリップボードを自動消去 |

### ユーティリティ

| 機能 | 説明 |
|------|------|
| コマンドパレット | `Cmd+Shift+Space` でどこからでもグローバル検索（カスタマイズ可能） |
| 自動アップデート | 新バージョンを検知し、アプリ内からダウンロード・再起動 |
| インポート / エクスポート | HTML / JSON インポート。複数ワークスペースは ZIP でまとめてエクスポート |
| ブラウザ拡張機能 | Chrome / Edge から閲覧中のページをワンクリック保存 |
| ダーク / ライトテーマ | OS設定に連動、手動切替も可能 |

---

## キーボードショートカット

| ショートカット | アクション |
|---|---|
| `Cmd/Ctrl+Shift+Space` | 検索パレットの切替（設定でカスタマイズ可能） |
| `Cmd/Ctrl+Shift+A` | 新しいリンクを追加 |
| `Cmd/Ctrl+K` | 検索にフォーカス |
| `Cmd/Ctrl+A` | すべてのリンクを選択 |
| `Escape` | 選択解除 / 閉じる |

---

## ブラウザ拡張機能

Chrome / Edge 向けの拡張機能で、閲覧中のページを素早く保存できます。

### インストール

1. [Releases](https://github.com/techarm/quick-mark/releases) から `quickmark-extension-vX.X.X.zip` をダウンロードして展開
2. ブラウザで `chrome://extensions` を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」→ 展開したフォルダを選択

### 初期設定

1. QuickMark デスクトップアプリを起動
2. 拡張機能の「オプション」を開く
3. **API トークン**を入力（設定 → 一般タブからコピー可能）
4. 「自動検出」でポートを検出 →「接続テスト」で確認

### 使い方

- **拡張機能アイコンをクリック** → タイトル・カテゴリを指定して保存
- **右クリックメニュー** →「QuickMark に保存」で素早く保存
- 保存済みのページには ★ バッジが表示されます

---

## 開発

### 前提条件

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

### コマンド

```bash
bun install      # 依存関係のインストール
bun tauri dev    # 開発サーバーの起動
bun run test     # テストの実行
bun tauri build  # 本番ビルド
```

> 開発時のデータベースはプロジェクト内（`src-tauri/data/`）に保存され、本番データとは分離されます。

---

## ライセンス

[MIT](LICENSE)
