# Todosh

A terminal-based Kanban task manager built with React and Ink.

## Features

- **Dashboard** - Manage multiple boards/projects
- **Kanban Board** - Three-column layout (To Do, Doing, Done)
- **Table View** - Alternative tabular task listing
- **Detail View** - Jira-style two-column layout with comments
- **Fuzzy Search** - Quick task filtering with `/`
- **Archive** - Soft-delete for boards and tasks
- **CLI** - Scriptable command-line interface
- **IPC** - Unix socket server for external integrations

## Installation

```bash
bun install
```

## Usage

### TUI

```bash
bun run start      # Run the TUI
bun run dev        # Run with hot reload
```

### CLI

```bash
bun cli.ts help                    # Show all commands
bun cli.ts boards                  # List boards
bun cli.ts board:create "Work"     # Create board
bun cli.ts add "Fix bug" -p high   # Add task
bun cli.ts list -b 1               # List tasks
bun cli.ts done 5                  # Mark done
bun cli.ts archive 5               # Archive task
```

## Keybinds

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate |
| `←/→` | Switch columns (Board) |
| `Alt+←/→` | Move task between columns |
| `Enter` | Select/Open |
| `n` | New item |
| `e` | Edit |
| `d` | Delete |
| `a` | Archive |
| `m` | Move task (modal) |
| `/` | Search |
| `Tab` | Toggle Board/Table view |
| `Esc` | Back / Clear filters |
| `q` | Quit |

Vim mode available via settings (`h/j/k/l` navigation).

## Configuration

Settings stored in `~/.config/todosh/settings.toml`:

```toml
[ui]
useNerdfonts = true

[keybinds]
mode = "default"  # or "vim"

[ipc]
enabled = true
```

## Tech Stack

- **Bun** - Runtime & package manager
- **React 19** - Component framework
- **Ink 6** - Terminal UI renderer
- **SQLite** - Data storage (via `bun:sqlite`)
- **Biome** - Linting & formatting

## License

MIT
