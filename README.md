# Todosh

Todos for the rest of us. A fast, keyboard-driven Kanban task manager for the terminal.

![recording-term3-ezgif com-optimize](https://github.com/user-attachments/assets/a17619b2-d455-4ab3-b1c0-9dc23eaecbaa)

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

| Key       | Action        | Key   | Action      |
| --------- | ------------- | ----- | ----------- |
| `↑` `↓`   | Navigate      | `n`   | New         |
| `←` `→`   | Switch column | `e`   | Edit        |
| `Alt+←/→` | Move task     | `d`   | Delete      |
| `Enter`   | Open          | `a`   | Archive     |
| `/`       | Search        | `Tab` | Toggle view |
| `Esc`     | Back          | `q`   | Quit        |

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

| Command         | Parameters                                                         |
| --------------- | ------------------------------------------------------------------ |
| `ping`          | —                                                                  |
| `boards:list`   | —                                                                  |
| `boards:get`    | `id`                                                               |
| `boards:create` | `name`, `description?`                                             |
| `boards:update` | `id`, `name?`, `description?`                                      |
| `boards:delete` | `id`                                                               |
| `tasks:list`    | `boardId?`, `status?`                                              |
| `tasks:get`     | `id`                                                               |
| `tasks:create`  | `boardId`, `title`, `description?`, `status?`, `priority?`         |
| `tasks:update`  | `id`, `title?`, `description?`, `status?`, `priority?`, `dueDate?` |
| `tasks:move`    | `id`, `status`                                                     |
| `tasks:delete`  | `id`                                                               |

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

## Linear boards

Todosh uses Linear's official [`@linear/sdk`](https://linear.app/developers/sdk).
Create a personal API key in Linear **Settings → Security & access → Personal API keys**, with access to the teams you want to connect and permission to create/update issues (and delete them if needed).
If `LINEAR_API_KEY` is set to a nonempty value, Todosh uses it for both the TUI and CLI, bypassing the OS keychain entirely. It takes precedence over a saved key and is never copied into storage. This works on headless VMs without a keyring.

```bash
export LINEAR_API_KEY="your-linear-api-key"
todosh
```

Unset it and restart Todosh to switch back to the saved key. `todosh linear:logout` removes only the saved key; it does not unset the environment variable.

Without an environment key, when you first choose **Connect to Linear**, Todosh prompts for your API key with masked input, validates it, and saves it in your OS credential store using [Bun.secrets](https://bun.com/docs/runtime/secrets). Subsequent connections and CLI commands reuse it; no environment variable is needed. The key is never saved in the database or settings.

Storage uses macOS Keychain, Windows Credential Manager, or Linux libsecret with an unlocked Secret Service (such as GNOME Keyring or KWallet). If secure storage is unavailable, Todosh shows an error and does not fall back to a file. Choose **Update Linear API key** in the new-board menu to replace a key, or run `todosh linear:logout` to remove it.

On the dashboard, press `n`, choose **Create locally** or **Connect to Linear**,
then select a team and either **All team issues** or an initial project filter.
Connections cache all of the team’s issues and project names; the project filter controls which cached issues are shown. Existing connections fill the team cache on their next successful refresh. Connecting an
already connected team/project reuses its board.

Boards have a separate **Project** field linked by Linear project ID. The name is
pulled on connection and refreshed on sync, including project renames. It appears
on the dashboard, board/table views, task details, and CLI board listings. Older
connections populate it on their next successful sync. Team-wide boards show
**All projects**; local boards show **Not set**. Press `c` in a Linear board or
table view to change its project (or return to **All projects**). Select with
↑/↓ and Enter; Esc cancels. The selection is a saved local filter over cached team issues: switching is instant, works offline, and makes no Linear requests. It does not rename the board or change its connected project. Issues without a project appear under **All projects**.

Connected boards refresh on open, every minute while viewed, and when you press
`r` in board/table view. Cached tasks remain available if Linear is unreachable;
failed writes display an error and do not change the cached task. Create, edit,
move, archive, and delete actions are sent to Linear. Deleting or archiving the
board itself only removes/hides the local connection, leaving Linear untouched.

Linear backlog, triage, and unstarted states appear in Todo; started states in
Doing; completed and canceled states in Done. Moving an issue selects the first
matching team workflow state (unstarted, started, or completed). Linear's “no
priority” appears as medium. Tags and comments are local annotations and are not
synchronized with Linear. Custom views and cross-team project boards are not supported;
choose a team and filter its cached issues by project.

CLI equivalents:

```bash
todosh linear:teams
todosh board:connect <team-id> [project-id]
todosh board:sync <board-id>
```

Task CLI commands also write through to Linear for connected boards. CLI lists
and IPC reads use the local cache; IPC task mutations on Linear boards are
rejected with guidance to use the TUI or CLI.

## Workflow logic

Board creation and Linear connection use an XState machine in
`lib/workflows/connect-board.ts`. Credential lookup, validation, team/project
selection, import, failures, and retries are explicit states. Canceling a read or
import aborts its requests and prevents committing the imported board; an OS
keychain save is allowed to finish before leaving its screen.

Each board has one shared XState operation queue in `lib/workflows/board-sync.ts`
for the lifetime of the database session. Refreshes and task writes run in order
across board, table, and detail views. Duplicate refresh requests are coalesced,
and polling runs only while the board is being viewed. SDK, SQLite, and keychain
operations remain in service functions. Actor snapshots are not persisted or
sent to an inspector; credentials stay in the OS keychain or the process environment.

Run `bun test` for service and workflow regression tests.

## Code quality

Todosh uses **Oxlint** for linting and **Oxfmt** for formatting (the Oxc toolchain).

```bash
bun run check         # Lint and verify formatting without changing files
bun run lint:fix      # Apply safe lint fixes
bun run format        # Format files and sort imports
bun run typecheck     # TypeScript checks
bun test              # Service and workflow tests
```

`.oxlintrc.json` enables correctness checks, TypeScript type-import consistency,
unused variables (underscore-prefixed placeholders are allowed), strict equality
(with null checks allowed), React hooks/dependencies, and JSX keys. Bun and Node
are the runtime environments; console output is allowed for the CLI. Browser DOM
and accessibility plugins are omitted because OpenTUI renders terminal widgets.

React compiler rules have narrow exceptions: the keyboard hooks use refs to keep
imperative event handlers current, and the listed SQLite-loading hooks and views
synchronize cached data or clamp selection in effects. Hook ordering and dependency
checks remain enabled everywhere. Formatting keeps tabs, double quotes, semicolons,
and an 80-column target. Generated output, dependencies, coverage, and the Bun
lockfile are excluded from formatting; generated directories are excluded from lint.
