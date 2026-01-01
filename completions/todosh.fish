# Fish completions for todosh

# Disable file completions
complete -c todosh -f

# Commands
set -l commands boards board:create board:delete board:archive list add done doing todo move delete archive help

complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a boards -d "List all boards"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a board:create -d "Create a new board"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a board:delete -d "Delete a board"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a board:archive -d "Archive a board"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a list -d "List tasks"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a add -d "Add a new task"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a done -d "Mark task as done"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a doing -d "Mark task as doing"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a todo -d "Mark task as todo"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a move -d "Move task to status"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a delete -d "Delete a task"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a archive -d "Archive a task"
complete -c todosh -n "not __fish_seen_subcommand_from $commands" -a help -d "Show help"

# list options
complete -c todosh -n "__fish_seen_subcommand_from list" -s b -l board -d "Filter by board ID" -x
complete -c todosh -n "__fish_seen_subcommand_from list" -s s -l status -d "Filter by status" -xa "todo doing done"

# add options
complete -c todosh -n "__fish_seen_subcommand_from add" -s b -l board -d "Board ID" -x
complete -c todosh -n "__fish_seen_subcommand_from add" -s d -l description -d "Task description" -x
complete -c todosh -n "__fish_seen_subcommand_from add" -s p -l priority -d "Priority level" -xa "low medium high urgent"

# move status completion
complete -c todosh -n "__fish_seen_subcommand_from move; and test (count (commandline -opc)) -ge 3" -xa "todo doing done"
