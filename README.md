# Todosh

Todos for the rest of us. A fast, keyboard-driven Kanban task manager for the terminal. IPC Enabled.

## Quick Start

```bash
bun install
bun run start
```

## Keybinds

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| `↑` `↓` | Navigate | `n` | New |
| `←` `→` | Switch column | `e` | Edit |
| `Alt+←/→` | Move task | `d` | Delete |
| `Enter` | Open | `a` | Archive |
| `/` | Search | `Tab` | Toggle view |
| `Esc` | Back | `q` | Quit |

Vim mode: `h/j/k/l` navigation (enable in settings).

## CLI

```bash
bun cli.ts boards                  # List boards
bun cli.ts board:create "Work"     # Create board
bun cli.ts add "Fix bug" -p high   # Add task
bun cli.ts done 5                  # Mark done
```

## IPC

Todosh exposes a Unix socket for external integrations at `/tmp/todosh.sock`.

Enable in config with `[ipc] enabled = true`, then send JSON messages:

```bash
echo '{"type":"ping"}' | nc -U /tmp/todosh.sock
# {"ok":true,"data":{"pong":true,"pid":12345}}

echo '{"type":"boards:list"}' | nc -U /tmp/todosh.sock
# {"ok":true,"data":{"boards":[...]}}

echo '{"type":"tasks:create","boardId":1,"title":"New task","priority":"high"}' | nc -U /tmp/todosh.sock
# {"ok":true,"data":{"task":{...}}}
```

**Available commands:**

| Command | Parameters |
|---------|------------|
| `ping` | — |
| `boards:list` | — |
| `boards:get` | `id` |
| `boards:create` | `name`, `description?` |
| `boards:update` | `id`, `name?`, `description?` |
| `boards:delete` | `id` |
| `tasks:list` | `boardId?`, `status?` |
| `tasks:get` | `id` |
| `tasks:create` | `boardId`, `title`, `description?`, `status?`, `priority?` |
| `tasks:update` | `id`, `title?`, `description?`, `status?`, `priority?`, `dueDate?` |
| `tasks:move` | `id`, `status` |
| `tasks:delete` | `id` |

## Config

`~/.config/todosh/settings.toml`

```toml
[ui]
useNerdfonts = true

[keybinds]
mode = "vim"  # or "default"

[ipc]
enabled = true
```

## Stack

Bun + React 19 + Ink 6 + SQLite

## License

MIT
