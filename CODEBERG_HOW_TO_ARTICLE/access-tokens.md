# Codeberg access tokens: one per person

How team members get API access to Codeberg for `mkrepo` and `dk-scaffold`, and why each
person generates their own token rather than sharing one.

<!-- TOC:START -->
- [Codeberg access tokens: one per person](#codeberg-access-tokens-one-per-person)
  - [Two settings, two jobs](#two-settings-two-jobs)
  - [How the token is used](#how-the-token-is-used)
  - [There is no "uber token"](#there-is-no-uber-token)
  - [Why not one shared token](#why-not-one-shared-token)
  - [Per-person token versus a shared bot token](#per-person-token-versus-a-shared-bot-token)
  - [Scaling](#scaling)
  - [Scopes](#scopes)
  - [Recommended setup guidance](#recommended-setup-guidance)
<!-- TOC:END -->

## Two settings, two jobs

- `CODEBERG_TOKEN` is *who you are*. It authenticates API calls (creating repos, listing
  repos with a CLI such as `tea`).
- `REPO_OWNER` is *where repos go* (an organization, or your own username).

Git pushes do not use the token. They use each person's SSH key.

## How the token is used

Two commands read `CODEBERG_TOKEN` from the shell environment: `mkrepo`, and `dk-scaffold`,
which calls `mkrepo` to create the repository. Both are defined in
[`assets/shell/aliases.sh`](../assets/shell/aliases.sh). Nothing else in the tool uses it:
`dk-new`, `dk-init` and `git push` do not (pushes use the SSH key).

`mkrepo <name>` sends two requests to `https://codeberg.org/api/v1`, each with the header
`Authorization: token $CODEBERG_TOKEN`:

| Step | Request | What it does | Token category and level |
|---|---|---|---|
| 1 | `GET /repos/<org>/<name>` | Checks whether the repository exists; if so, stops with exit code 2 | `repository`, read |
| 2 | `POST /orgs/<org>/repos` | Creates the public repository in `<org>` | `organization`, write |

The categories follow Forgejo's
[token scope table](https://forgejo.org/docs/latest/user/token-scope/): `repos/*` routes
belong to `repository` and `orgs/*` routes to `organization`. The token set in
[Part 3 of the onboarding guide](onboarding-a-new-user.md#part-3-each-person-on-codeberg)
also includes `repository` write, which these two requests do not need.

Codeberg checks two separate things before it accepts step 2:

- **The token's scope**: what the API call may attempt (the table above).
- **The account's team permission**: the token's owner must be on a team in `<org>` with
  **Create repositories** ticked, as described in
  [orgs-teams-and-members.md](orgs-teams-and-members.md).

Both must pass. A 401 means the token is invalid. A 403 means a scope is missing, and the
response body names it. `mkrepo` shows only the HTTP status, not that explanation.

## There is no "uber token"

On Codeberg (Forgejo), a token is created by its owner, in that owner's own account
settings. Nobody can mint a token on another person's behalf, and a token that could do
so would be a privilege-escalation risk. Minting one from a username and password through
the API is possible, but it means handling passwords in scripts and breaks with 2FA.

So nothing secret is distributed. What an admin distributes is the *permission*:

1. The org owner adds the person to an org team that may create and write repos.
2. The person generates their own token in their own account.

## Why not one shared token

- A token belongs to one account. Every action is attributed to that account's owner, and
  if that person leaves, everyone sharing the token breaks at once.
- "All scopes" means full control of that account: deleting repos, editing keys and
  profile, org administration. The token would sit in plaintext in shell environments and
  tool configs on several machines. A leak is an account takeover.
- Removing a departing member means rotating a secret that many people know.

## Per-person token versus a shared bot token

| | Per-person token | Shared bot token |
|---|---|---|
| Onboarding | Generate a token, then export it | Fetch it from the password manager, then export it |
| Attribution | Repo creation shows who did it | Everything shows as the bot |
| Someone leaves | Remove them from the org | Rotate the secret; everyone updates |
| Leak | Revoke one token | Affects everyone; source unclear |
| Upkeep | None | A separate account to secure and keep within Codeberg's rules |

For a small team, use per-person tokens. A bot account is the right identity for
automation such as CI, with its own narrowly scoped token, but not as a shared human login.

## Scaling

Per-person tokens cost the same at any team size. A shared token gets worse as the team
grows. At large sizes most people need no token at all: pushes use SSH keys, and
`dk-scaffold --local` needs no token. Only the people who create repos need
`CODEBERG_TOKEN`, so a small repo-creator team in the org is enough. A very large team
would likely want a self-hosted Forgejo instance for org-level controls and SSO; check
Codeberg's current limits and terms before planning around Codeberg itself.

## Scopes

Create the token at <https://codeberg.org/user/settings/applications/tokens/new>. The
form has one dropdown per category (`user`, `repository`, `organization` and others), each
set to **No access**, **Read** or **Read and write**. A scope name such as `read:user`
means the `user` category set to **Read**, and `write:organization` means `organization`
set to **Read and write**. **Read and write** includes **Read**. Use the narrowest scopes
that work, as follows:

- `read:user`: lets a CLI identify the token's owner (for example `tea login add`)
- `read:repository`: list and read repos
- `write:repository`: update repository files and pull requests through the API (git
  pushes use SSH keys, not the token)
- `write:organization`: create repos inside an org

Codeberg shows the token value once, so save it in the password manager immediately.
A request with an invalid token returns 401. A valid token that lacks a required scope
returns 403 and names the missing scope in the response body.

## Recommended setup guidance

[Onboarding's machine-setup step](onboarding-a-new-user.md#part-4-each-person-on-their-machine)
should walk a new person through it (today it covers steps 1–3 as manual prose; steps 4–5
are not yet implemented there):

1. Print the token-creation URL and the scopes to select.
2. Tell them to save the token in their password manager.
3. Prompt for the token with hidden input, so it stays out of shell history.
4. Verify it with `GET /user`, expecting 200, and name the missing scope on a 403.
5. Store it in a `chmod 600` file that `aliases.sh` sources, rather than in a shell rc.

Steps 4 and 5 add maintenance cost, so start with steps 1 to 3 and decide on 4 and 5
separately.
