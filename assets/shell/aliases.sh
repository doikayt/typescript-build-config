#!/usr/bin/env bash
# doikayt shell tools — standard team aliases for creating and scaffolding repos.
# Source this from your shell rc (see the README, "Team shell aliases").

# --- config (override via env if needed) ---
# REPO_OWNER is the Codeberg account/org that owns created repos (the "owner" in
# owner/repo). DOIKAYT_ORG is the old name, still honored for backward compat.
: "${REPO_OWNER:=${DOIKAYT_ORG:-doikayt}}"
: "${DOIKAYT_TBC:=@doikayt/typescript-build-config}"
: "${CODEBERG_API:=https://codeberg.org/api/v1}"
: "${CODEBERG_REPO_SCOPE:=org}"

# Resolve the current checkout reliably even after the caller `cd`s elsewhere.
# This avoids falling back to the published npm package when a developer is
# testing the repo they are editing.
__DK_ALIAS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
__DK_REPO_ROOT="$(cd "${__DK_ALIAS_DIR}/../.." && pwd)"

# --- Repo bootstrap ---

# ---------------------------------------------------------------------------
# mkrepo <name> ("make repo"): create a public repo in the org (guards
# against duplicates).
# ---------------------------------------------------------------------------
mkrepo() {
    if [ -z "$1" ]; then
        echo "❌ Usage: mkrepo <repo-name>"
        return 1
    fi

    local REPO_NAME="$1"
    local FULL_REPO_NAME="${REPO_OWNER}/${REPO_NAME}"

    if ! command -v curl &> /dev/null; then
        echo "❌ curl is required to create Codeberg repositories."
        return 1
    fi
    if [ -z "${CODEBERG_TOKEN:-}" ]; then
        echo "❌ CODEBERG_TOKEN is not set — create a Codeberg API token first."
        echo "   For a local scaffold without a repo, run: dk-scaffold <name> --local"
        echo "   For a remote scaffold, export CODEBERG_TOKEN and REPO_OWNER=<your-codeberg-org>"
        return 1
    fi

    echo "🔍 Checking if '${FULL_REPO_NAME}' already exists..."
    # Exit 2 (not 1) signals "already exists" so callers like dk-scaffold can
    # treat it as non-fatal and continue, while true failures stay exit 1.
    if curl --fail --silent --show-error \
        -H "Authorization: token ${CODEBERG_TOKEN}" \
        "${CODEBERG_API}/repos/${FULL_REPO_NAME}" >/dev/null; then
        echo "ℹ️  Repository '${FULL_REPO_NAME}' already exists:"
        echo "   https://codeberg.org/${FULL_REPO_NAME}"
        return 2
    fi

    echo "🚀 Creating public Codeberg repository '${FULL_REPO_NAME}'..."
    local create_url="${CODEBERG_API}/orgs/${REPO_OWNER}/repos"
    if [ "${CODEBERG_REPO_SCOPE}" = "user" ]; then
        create_url="${CODEBERG_API}/user/repos"
    fi
    if ! curl --fail --silent --show-error \
        -X POST \
        -H "Authorization: token ${CODEBERG_TOKEN}" \
        -H "Content-Type: application/json" \
        "${create_url}" \
        --data "{\"name\":\"${REPO_NAME}\",\"private\":false}" >/dev/null; then
        echo "❌ Failed to create repository."
        return 1
    fi

    echo "✅ Created https://codeberg.org/${FULL_REPO_NAME}"
    echo "   Clone: git@codeberg.org:${FULL_REPO_NAME}.git"
}

# ---------------------------------------------------------------------------
# addpush [repo-name] ("add, push"): wire up the current directory to an
# existing Codeberg repo (create it first with mkrepo) and push. init ->
# remote -> add -> commit -> branch -M main -> push -u. Idempotent: safe to
# re-run. Defaults repo-name to the current directory's name if omitted.
# ---------------------------------------------------------------------------
addpush() {
    local REPO_NAME="${1:-$(basename "$PWD")}"
    local remote_url="git@codeberg.org:${REPO_OWNER}/${REPO_NAME}.git"

    if ! git config user.email >/dev/null 2>&1 || ! git config user.name >/dev/null 2>&1; then
        echo "❌ Git identity not configured — needed to commit."
        echo "   Set it once, then re-run addpush:"
        echo "     git config --global user.email \"you@example.com\""
        echo "     git config --global user.name \"Your Name\""
        return 1
    fi

    [ -d .git ] || git init

    git remote get-url origin &>/dev/null \
        && git remote set-url origin "$remote_url" \
        || git remote add origin "$remote_url"

    git add -A
    git diff --cached --quiet || git commit -m "Initial commit"

    git branch -M main
    if ! git push -u origin main; then
        echo "❌ Push failed — check that '${REPO_OWNER}/${REPO_NAME}' exists (mkrepo ${REPO_NAME}) and you have access."
        return 1
    fi

    echo "✅ Pushed to https://codeberg.org/${REPO_OWNER}/${REPO_NAME}"
}

# --- Sync ---

# ---------------------------------------------------------------------------
# gp ("git pull-push"): pull --rebase, then push the current branch. The
# everyday git sync command. Requires the branch to already track a remote
# (see gpu/trackify below if it doesn't).
# ---------------------------------------------------------------------------
gp() {
    if ! git pull --rebase; then
        echo "❌ Pull failed — stopping" >&2
        return 1
    fi

    local branch
    branch=$(git rev-parse --abbrev-ref HEAD)

    if [ -z "$branch" ]; then
        echo "❌ Could not determine current branch" >&2
        return 1
    fi

    if ! git push origin HEAD:"$branch"; then
        echo "❌ git push failed" >&2
        return 1
    fi

    echo "✅ Pulled with rebase and pushed to $branch"
}

# ---------------------------------------------------------------------------
# gpu ("git push, set upstream"): first push of a new local branch — sets
# the upstream tracking branch so `gp` works on it afterward. If origin
# already has a same-named branch (e.g. someone else pushed it first), just
# wires up tracking; otherwise pushes and sets tracking in one step.
# ---------------------------------------------------------------------------
gpu() {
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD)

    if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
        echo "❌ Not on a branch (detached HEAD?)" >&2
        return 1
    fi

    if git rev-parse --verify --quiet "origin/$branch" > /dev/null; then
        git branch --set-upstream-to="origin/$branch" "$branch"
    else
        git push -u origin HEAD
    fi
}

# ---------------------------------------------------------------------------
# trackify ("make it track"): set the upstream tracking branch for the
# current branch to the same-named branch on origin. Does not push — the
# remote branch must already exist (e.g. pushed from another machine, or
# created on Codeberg).
# ---------------------------------------------------------------------------
trackify() {
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD)

    if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
        echo "❌ Not on a branch (detached HEAD?)" >&2
        return 1
    fi

    git branch --set-upstream-to="origin/$branch" "$branch"
}

# --- Diff & inspect ---

# glastdiff ("git last diff"): show the diff introduced by the last commit.
alias glastdiff="git diff HEAD~1 HEAD"

# gdw ("git diff, whitespace-ignored"): diff ignoring whitespace changes.
alias gdw="git diff -w"

# gdf ("git diff, fancy" -- best guess at the mnemonic): diff ignoring
# whitespace, with word-level color highlighting.
alias gdf="git diff -w --color-words"

# gda ("git diff, all"): word-level diff of both unstaged and staged changes
# together.
alias gda="git diff -w --color-words && git diff --staged -w --color-words"

# gdfs ("git diff, fancy, staged"): word-level diff of staged changes only.
alias gdfs="git diff --staged -w --color-words"

# glf ("git log, files"): log with the files touched by each commit.
alias glf='git log --pretty=format:"%h %ad %s" --date=short --name-only'

# --- Cleanup ---

# rmlock ("remove lock"): remove a stale git lock file, after a
# crashed/killed git process.
alias rmlock="rm -f .git/index.lock"

# gundo ("git undo"): undo the last commit, keeping its changes staged.
alias gundo="git reset --soft HEAD~1"

# ---------------------------------------------------------------------------
# rmbranch <branch> ("remove branch"): delete a branch both locally and on
# origin, then force-push the current branch. Errors are logged to
# ~/.git_death_note.log rather than stopping the cleanup partway through.
# ---------------------------------------------------------------------------
rmbranch() {
    if [[ $# -lt 1 ]]; then
        echo "❌ Usage: rmbranch <branch-to-delete>"
        return 1
    fi

    local BR="$1"
    local CURRENT_BRANCH
    local DEATH_NOTE="$HOME/.git_death_note.log"

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>>"$DEATH_NOTE")

    echo "📛 Attempting to delete remote branch: $BR"
    git push origin --delete "$BR" 2>>"$DEATH_NOTE"

    echo "📛 Attempting to delete local branch: $BR"
    git branch -D "$BR" 2>>"$DEATH_NOTE"

    echo "🚀 Force-pushing current branch '$CURRENT_BRANCH' to origin"
    git push origin "$CURRENT_BRANCH" --force-with-lease 2>>"$DEATH_NOTE"

    echo "✅ Branch '$BR' removed, and '$CURRENT_BRANCH' force-pushed."
    echo "📝 Errors (if any) logged to: $DEATH_NOTE"
}

# curr-branch ("current branch"): print the current branch name.
curr-branch() {
    git rev-parse --abbrev-ref HEAD
}

# ---------------------------------------------------------------------------
# gm ("git main"): check out the repo's default branch. Queried live from
# origin rather than assumed as "main" -- these repos are `git init`, not
# `git clone`, so there's often no local origin/HEAD ref to fall back on.
# ---------------------------------------------------------------------------
gm() {
    local default_branch
    default_branch=$(git ls-remote --symref origin HEAD 2>/dev/null \
        | awk '/^ref:/ {sub("refs/heads/", "", $2); print $2}')

    if [ -z "$default_branch" ]; then
        echo "❌ Could not determine the default branch from origin." >&2
        return 1
    fi

    git checkout "$default_branch"
}

# --- CLI wrappers ---

# Prefer the local repo checkout when this file is being used from a dev clone.
# That keeps the shell aliases pinned to the code you are actively editing,
# instead of silently pulling the published npm package.
dk-new() {
    if [ -f "${__DK_REPO_ROOT}/src/cli.js" ]; then
        node "${__DK_REPO_ROOT}/src/cli.js" new "$@"
        return
    fi
    npx "$DOIKAYT_TBC" new "$@"
}

# dk-init : scaffold the shared build config into the current project.
dk-init() {
    if [ -f "${__DK_REPO_ROOT}/src/cli.js" ]; then
        node "${__DK_REPO_ROOT}/src/cli.js" init "$@"
        return
    fi
    npx "$DOIKAYT_TBC" init "$@"
}

# ---------------------------------------------------------------------------
# dk-scaffold <name> [lib|app] [--local] [-q] : create the repo, scaffold a
# project, push. Defaults to an app (private). Answers init non-interactively.
# Pass --local (or -l) to scaffold and run the CI gate only — no Codeberg repo,
# no push (the "Level 0" tire-kick; needs no API token). Pass --quiet (or -q)
# to hide the note explaining that the prompts are answered automatically.
# ---------------------------------------------------------------------------
dk-scaffold() {
    # Positional <name>|. and optional [lib|app]; flags may appear anywhere.
    local local_only=0 quiet=0 name="" kind="" arg
    for arg in "$@"; do
        case "$arg" in
            --local | -l) local_only=1 ;;
            --quiet | -q) quiet=1 ;;
            *)
                if [ -z "$name" ]; then
                    name="$arg"
                elif [ -z "$kind" ]; then
                    kind="$arg"
                fi
                ;;
        esac
    done
    kind="${kind:-app}"
    if [ -z "$name" ]; then
        echo "❌ Usage: dk-scaffold <name>|. [lib|app] [--local] [-q]"
        return 1
    fi

    # "." means: scaffold in the current directory, using its leaf name as the
    # package/repo name (full package becomes @${REPO_OWNER}/<leaf>). No mkdir.
    local in_place=0
    if [ "$name" = "." ]; then
        name="$(basename "$PWD")"
        in_place=1
    fi

    # A git identity is required — the scaffold makes a commit (Level 1 pushes
    # it). Check up front and fail fast with instructions, rather than aborting
    # mid-run after the slower scaffold + install.
    if ! git config user.email >/dev/null 2>&1 || ! git config user.name >/dev/null 2>&1; then
        echo "❌ Git identity not configured — needed to commit the scaffold."
        echo "   Set it once, then re-run dk-scaffold:"
        echo "     git config --global user.email \"you@example.com\""
        echo "     git config --global user.name \"Your Name\""
        return 1
    fi

    if [ "$quiet" -eq 0 ]; then
        echo "ℹ️  dk-scaffold answers all setup prompts for you automatically."
        echo "   They may look like they are waiting for input; give it a moment. (-q hides this note.)"
    fi

    # --local skips repo creation entirely (no Codeberg token needed); rc stays 0.
    local rc=0
    if [ "$local_only" -eq 0 ]; then
        if [ -z "${CODEBERG_TOKEN:-}" ]; then
            echo "❌ CODEBERG_TOKEN is not set — create a Codeberg API token first."
            echo "   For a local scaffold without a repo, run: dk-scaffold ${name} --local"
            echo "   For a remote scaffold, export CODEBERG_TOKEN and REPO_OWNER=<your-codeberg-org>"
            return 1
        fi
        mkrepo "$name"
        rc=$?
        if [ "$rc" -eq 2 ]; then
            echo "ℹ️  Continuing scaffold against the existing ${REPO_OWNER}/${name} repo."
        elif [ "$rc" -ne 0 ]; then
            return 1
        fi
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

    if [ "$local_only" -eq 1 ]; then
        echo "✅ Scaffolded ${name} locally (${kind}) — no repo created, nothing pushed."
        echo "   Explore: 'npm test', 'npm run build' (→ dist/), and the generated"
        echo "   README diagrams. Re-run without --local to create a repo and push."
        return 0
    fi

    local remote_url="git@codeberg.org:${REPO_OWNER}/${name}.git"
    git remote get-url origin &>/dev/null \
        && git remote set-url origin "$remote_url" \
        || git remote add origin "$remote_url"
    if [ "$rc" -eq 2 ]; then
        # The repo pre-existed, so its main likely diverges from this fresh
        # scaffold's root commit. Overwriting it is destructive, so confirm
        # first. On yes, force with --force-with-lease (fetch first to seed a
        # baseline) so a concurrent push aborts us instead of being clobbered.
        echo "⚠️  Remote ${REPO_OWNER}/${name} already existed."
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

    echo "✅ Scaffolded ${REPO_OWNER}/${name} (${kind})"
}

# --- Introspection ---

# galiases ("git aliases"): print every alias/function in this file, grouped,
# with a one-line summary parsed from each one's own doc comment.
galiases() {
    node "${__DK_ALIAS_DIR}/list-aliases.mjs"
}
