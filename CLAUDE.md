# CLAUDE.md — typescript-build-config

## ACTIVE ROLE:  WIKI-AUTHOR

---

## Repo notes

- This is **not** an Nx workspace. Format and check with `npm run update-all-format` and
  `npm run check-format`; run tests with `npm test`. Neither format command covers
  `CODEBERG_HOW_TO_ARTICLE/`, so run the `awk 'length > 100'` check on docs you touch.
- Repos are always created under a Codeberg organization (`REPO_OWNER`), never a personal
  account. `CODEBERG_REPO_SCOPE` no longer exists.
- Docs in [`CODEBERG_HOW_TO_ARTICLE/`](CODEBERG_HOW_TO_ARTICLE/) give a direct URL for every
  page the reader has to visit (see the `WRITER` role); keep the click path in parentheses.
- Commit locally; pushes are blocked from sessions, so hand over the push command.
