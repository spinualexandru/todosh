# Bash completions for todosh

_todosh() {
    local cur prev words cword
    _init_completion || return

    local commands="boards board:create board:delete board:archive list add done doing todo move delete archive help"
    local statuses="todo doing done"
    local priorities="low medium high urgent"

    case "${prev}" in
        -b|--board)
            return 0
            ;;
        -s|--status)
            COMPREPLY=($(compgen -W "${statuses}" -- "${cur}"))
            return 0
            ;;
        -p|--priority)
            COMPREPLY=($(compgen -W "${priorities}" -- "${cur}"))
            return 0
            ;;
        -d|--description)
            return 0
            ;;
        move)
            # After 'move <id>', suggest statuses
            if [[ ${cword} -eq 3 ]]; then
                COMPREPLY=($(compgen -W "${statuses}" -- "${cur}"))
            fi
            return 0
            ;;
    esac

    case "${words[1]}" in
        list)
            COMPREPLY=($(compgen -W "-b --board -s --status" -- "${cur}"))
            return 0
            ;;
        add)
            COMPREPLY=($(compgen -W "-b --board -d --description -p --priority" -- "${cur}"))
            return 0
            ;;
        move)
            if [[ ${cword} -eq 3 ]]; then
                COMPREPLY=($(compgen -W "${statuses}" -- "${cur}"))
            fi
            return 0
            ;;
    esac

    if [[ ${cword} -eq 1 ]]; then
        COMPREPLY=($(compgen -W "${commands}" -- "${cur}"))
        return 0
    fi
}

complete -F _todosh todosh
