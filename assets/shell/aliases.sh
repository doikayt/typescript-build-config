#!/usr/bin/env bash
# doikayt shell tools — standard team aliases for creating and scaffolding repos.
# Source this from your shell rc (see the README, "Team shell aliases").

# --- config (override via env if needed) ---
: "${DOIKAYT_ORG:=doikayt}"
: "${DOIKAYT_TBC:=@doikayt/typescript-build-config}"

# ---------------------------------------------------------------------------
# mkrepo <name> : create a public repo in the org (guards against duplicates).
# ---------------------------------------------------------------------------
mkrepo() {
    if [ -z "$1" ]; then
        echo "❌ Usage: mkrepo <repo-name>"
        return 1
    fi

    local REPO_NAME="$1"
    local FULL_REPO_NAME="${DOIKAYT_ORG}/${REPO_NAME}"

    if ! command -v gh &> /dev/null; then
        echo "❌ GitHub CLI 'gh' is not installed (https://cli.github.com/)."
        return 1
    fi
    if ! gh auth status &> /dev/null; then
        echo "❌ Not authenticated with gh — run 'gh auth login' first."
        return 1
    fi

    echo "🔍 Checking if '${FULL_REPO_NAME}' already exists..."
    # Exit 2 (not 1) signals "already exists" so callers like dk-scaffold can
    # treat it as non-fatal and continue, while true failures stay exit 1.
    if gh repo view "${FULL_REPO_NAME}" &> /dev/null; then
        echo "ℹ️  Repository '${FULL_REPO_NAME}' already exists:"
        echo "   https://github.com/${FULL_REPO_NAME}"
        return 2
    fi

    echo "🚀 Creating public repository '${FULL_REPO_NAME}'..."
    # Note: newer gh (2.x) removed --confirm; passing a name is non-interactive.
    if ! gh repo create "${FULL_REPO_NAME}" --public; then
        echo "❌ Failed to create repository."
        return 1
    fi

    echo "✅ Created https://github.com/${FULL_REPO_NAME}"
    echo "   Clone: git@github.com:${FULL_REPO_NAME}.git"
}

# ---------------------------------------------------------------------------
# Thin wrappers over the @doikayt/typescript-build-config CLI.
# ---------------------------------------------------------------------------

# dk-new : `npm init -y` + @doikayt scope on the package name.
dk-new() { npx "$DOIKAYT_TBC" new "$@"; }

# dk-init : scaffold the shared build config into the current project.
dk-init() { npx "$DOIKAYT_TBC" init "$@"; }

# ---------------------------------------------------------------------------
# dk-scaffold <name> [lib|app] : create the repo, scaffold a project, push.
# Defaults to an app (private). Answers init non-interactively.
# ---------------------------------------------------------------------------
dk-scaffold() {
    local name="$1" kind="${2:-app}"
    if [ -z "$name" ]; then
        echo "❌ Usage: dk-scaffold <name>|. [lib|app]"
        return 1
    fi

    # "." means: scaffold in the current directory, using its leaf name as the
    # package/repo name (full package becomes @${DOIKAYT_ORG}/<leaf>). No mkdir.
    local in_place=0
    if [ "$name" = "." ]; then
        name="$(basename "$PWD")"
        in_place=1
    fi

    mkrepo "$name"
    local rc=$?
    if [ "$rc" -eq 2 ]; then
        echo "ℹ️  Continuing scaffold against the existing ${DOIKAYT_ORG}/${name} repo."
    elif [ "$rc" -ne 0 ]; then
        return 1
    fi

    # Land in the project directory. If we're already standing in an empty dir
    # named "$name", scaffold in place; otherwise create (or reuse) a "$name"
    # subdirectory and enter it.
    if [ "$in_place" -eq 1 ] || { [ "$(basename "$PWD")" = "$name" ] && [ -z "$(ls -A . 2>/dev/null)" ]; }; then
        echo "ℹ️  Scaffolding in place in ${PWD}."
    else
        mkdir -p "$name" && cd "$name" || return 1
    fi

    dk-new
    npm install --save-dev "$DOIKAYT_TBC"

    # init prompts: UI? / publishable library? / (name, library only) / demo?
    if [ "$kind" = "lib" ]; then
        printf 'n\ny\n\ny\n' | dk-init   # ui=n, library=y, name=<default>, demo=y
    else
        printf 'n\nn\ny\n' | dk-init     # ui=n, library=n, demo=y
    fi

    npm install
    npm run update-all-format   # single pass converges (autogen orders NX→UML→TOC)

    # Idempotent so re-running (or scaffolding "." into an existing repo) is safe.
    git init && git branch -M main
    git add -A
    git diff --cached --quiet || git commit -m "chore: scaffold"   # skip if nothing staged

    # Gate: run the exact command CI runs (release.yml: `npm run ci` =
    # check-all-format && test) before touching the remote. Refuse to push a tree
    # CI would reject — this guards both the normal and the force-push paths below,
    # so a force-push can never clobber an existing main with a red build.
    if ! npm run ci; then
        echo "❌ 'npm run ci' failed — refusing to push a tree CI will reject."
        echo "   Fix locally, then re-run dk-scaffold (it is idempotent)."
        return 1
    fi

    local remote_url="git@github.com:${DOIKAYT_ORG}/${name}.git"
    git remote get-url origin &>/dev/null \
        && git remote set-url origin "$remote_url" \
        || git remote add origin "$remote_url"
    if [ "$rc" -eq 2 ]; then
        # The repo pre-existed, so its main likely diverges from this fresh
        # scaffold's root commit. Overwriting it is destructive, so confirm
        # first. On yes, force with --force-with-lease (fetch first to seed a
        # baseline) so a concurrent push aborts us instead of being clobbered.
        echo "⚠️  Remote ${DOIKAYT_ORG}/${name} already existed."
        echo "    Pushing this scaffold will OVERWRITE its main branch history."
        printf "    Force-push over it? [y/N] "
        local reply
        read -r reply
        case "$reply" in
            [yY] | [yY][eE][sS])
                git fetch origin &>/dev/null
                git push -u origin main --force-with-lease
                ;;
            *)
                echo "⏭️  Skipped push. To overwrite the remote later:"
                echo "    git fetch origin && git push -u origin main --force-with-lease"
                ;;
        esac
    else
        git push -u origin main
    fi

    echo "✅ Scaffolded ${DOIKAYT_ORG}/${name} (${kind})"
}
