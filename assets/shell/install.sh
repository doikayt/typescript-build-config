#!/usr/bin/env bash
# As part of one-time setup: adds a line sourcing assets/shell/aliases.sh to your shell rc,
# so the doikayt team aliases (mkrepo, dk-new, dk-init, dk-scaffold) always load.
# Idempotent — safe to re-run.
#
# Usage flow: run this with `./assets/shell/install.sh` (execute it, don't
# source it), then reload with `exec $SHELL` -- a genuinely fresh shell, not
# just `source assets/shell/aliases.sh` in your current one. If your shell
# already has an old alias/function under a name aliases.sh now defines (e.g.
# after re-running this following an update), sourcing directly can fail with
# a confusing "syntax error near unexpected token" -- a fresh shell never had
# the stale definition to begin with.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$DIR/aliases.sh"
LINE="source \"$SRC\""

added=0
found_any=0
for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
    [ -f "$rc" ] || continue
    found_any=1
    if grep -qF "$LINE" "$rc"; then
        echo "Already sourced in $rc"
    else
        printf '\n# doikayt shell aliases\n%s\n' "$LINE" >> "$rc"
        echo "Added source line to $rc"
        added=1
    fi
done

# No shell rc existed yet (e.g. a fresh NixOS user, whose ~/.bashrc is not
# auto-created) — create one so the aliases install instead of silently no-op'ing.
if [ "$found_any" -eq 0 ]; then
    case "${SHELL:-}" in
        *zsh) rc="$HOME/.zshrc" ;;
        *) rc="$HOME/.bashrc" ;;
    esac
    printf '\n# doikayt shell aliases\n%s\n' "$LINE" >> "$rc"
    echo "Created $rc and added source line"
    added=1
fi

if [ "$added" -eq 0 ]; then
    echo "Nothing to do — already installed."
else
    echo "Done. Reload with a fresh shell to pick it up: exec \$SHELL"
fi
