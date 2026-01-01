# Todosh

Todos for the rest of us. A fast, keyboard-driven Kanban task manager for the terminal.

## Install

```bash
# From source (requires Bun)
git clone https://github.com/alexspinu/todosh
cd todosh
bun install

# Symlink to ~/.local/bin
mkdir -p ~/.local/bin
ln -sf "$PWD/bin/todosh.ts" ~/.local/bin/todosh
```

## Usage

```bash
todosh              # Launch TUI
todosh <command>    # Run CLI command
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
todosh boards                  # List boards
todosh board:create "Work"     # Create board
todosh add "Fix bug" -p high   # Add task
todosh done 5                  # Mark done
todosh completions             # Install shell completions
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
