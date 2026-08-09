#!/usr/bin/env bash
# One-time setup: add a line sourcing shell-assets/aliases.sh to your shell rc,
# so the doikayt team aliases (mkrepo, dk-new, dk-init, dk-scaffold) always load.
# Idempotent — safe to re-run. Usage: ./shell-assets/install.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$DIR/aliases.sh"
LINE="source \"$SRC\""

added=0
for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
    [ -f "$rc" ] || continue
    if grep -qF "$LINE" "$rc"; then
        echo "Already sourced in $rc"
    else
        printf '\n# doikayt shell aliases\n%s\n' "$LINE" >> "$rc"
        echo "Added source line to $rc"
        added=1
    fi
done

if [ "$added" -eq 0 ]; then
    echo "Nothing to do — already installed."
else
    echo "Done. Restart your shell, or run: source \"$SRC\""
fi
