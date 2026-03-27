# QuickMark

A fast, cross-platform bookmark and credential manager built with Tauri, React, and TypeScript.

## Features

- **Link Management** — Save, organize, and search bookmarks with automatic metadata and favicon fetching
- **Smart Folders** — Pre-built filters: All Links, Recently Added, Temporary Links, Expired, Pinned, Credentials
- **Categories** — Hierarchical folders with custom colors for organizing links
- **Temporary Links** — Set expiration dates on bookmarks for automatic cleanup
- **Credential Storage** — Save usernames and passwords with one-click copy and 30-second auto-clear
- **Command Palette** — Global search with `Cmd+Shift+Space` / `Ctrl+Shift+Space` for instant access
- **Browser Extension** — Chrome/Edge extension for quick saving from any webpage
- **Import/Export** — Import bookmarks from browsers (HTML) or JSON backups, export your full library
- **Bulk Operations** — Multi-select links to move or delete in batch
- **Dark/Light Theme** — Toggle between themes with persistent preference
- **Cross-Platform** — Native builds for macOS (Apple Silicon & Intel) and Windows

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI, Zustand
- **Backend**: Rust, Tauri v2, SQLite
- **Build**: Vite, Biome

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

### Development

```bash
# Install dependencies
bun install

# Start dev server
bun tauri dev
```

### Build

```bash
# Build for current platform
bun tauri build
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+Shift+Space` | Toggle search palette |
| `Cmd/Ctrl+Shift+A` | Add new link |
| `Cmd/Ctrl+K` | Focus search |
| `Cmd/Ctrl+A` | Select all links |
| `Escape` | Deselect / Close |

## License

[MIT](LICENSE)
