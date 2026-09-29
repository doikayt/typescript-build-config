# How Codeberg organizes orgs, teams, and members

A concept backgrounder: what an organization, a team, and a member actually are on
Codeberg, and how they relate to repository access. [access-tokens.md](access-tokens.md)
covers the token side of this, and [onboarding-a-new-user.md](onboarding-a-new-user.md)
walks through setting one of these up step by step. This doc is the *why*/*what*
behind both.

<!-- TOC:START -->
- [How Codeberg organizes orgs, teams, and members](#how-codeberg-organizes-orgs-teams-and-members)
  - [The hierarchy](#the-hierarchy)
  - [Organizations](#organizations)
  - [Teams](#teams)
  - [Members and collaborators](#members-and-collaborators)
  - [Visibility](#visibility)
  - [Invites](#invites)
  - [Where this shows up in the tooling](#where-this-shows-up-in-the-tooling)
<!-- TOC:END -->

## The hierarchy

```text
Account (a person)
  |
  |-- can own repos directly (no org involved)
  |
  '-- can belong to one or more Organizations
        |
        |-- has an "Owners" team (auto-created, full control)
        |
        '-- has zero or more other Teams
              |
              |-- has Members (accounts)
              |
              '-- is granted access to Repositories
                    (all of the org's repos, or a specific list)
```

A repo's owner (the `<owner>` in `owner/repo`) is either a **username** or an
**organization name** — this is exactly the `REPO_OWNER` /
`CODEBERG_REPO_SCOPE` distinction `aliases.sh` uses: `CODEBERG_REPO_SCOPE=org`
(the default) creates repos under an organization, `CODEBERG_REPO_SCOPE=user`
creates them directly under your own account, with no org involved at all.

## Organizations

An organization is a shared account that a group of people collaborate through.
Anyone can create one, for free. When you create one:

- You choose its **visibility** (same public/limited/private model as a personal
  profile — see [Visibility](#visibility) below).
- An **Owners** team is created automatically, containing you.
- You choose whether repository admins are allowed to grant *other* teams access
  to their repo themselves (Settings → Collaborators on that repo), or whether
  only org owners can do that.

**Only members of the Owners team** can: add/remove members and teams, set a
team's access rights, edit or delete the organization, and touch a repo's
"danger zone" settings (transfer ownership, delete the wiki or the repo,
archive it). Owners can do everything an Admin can, but not everyone who can
administer a *repository* is necessarily an org Owner — see
[Members and collaborators](#members-and-collaborators).

## Teams

A team is how an organization grants a group of members the same access to the
same set of repositories, instead of adding each person to each repo one at a
time. Two things you configure per team:

1. **Which repos it can see** — either *all* of the organization's repositories,
   or a specific list you assign.
2. **What it can do to each one** — either fine-grained per-unit permissions, or
   blanket Administrator access.

If you don't grant Administrator access, each of these six units gets its own
level (**No Access**, **Read**, or **Write**): Code, Issues, Pull Requests,
Releases, Wiki, Projects. Two more (External Wiki, External Issues) are simple
on/off toggles. Administrator access skips all of that and just grants full
control, equivalent to the Admin level below.

One setting matters a lot in practice: a team can be given permission to
**create new repositories** on the org's behalf. `mkrepo`/`dk-scaffold` depend
on this — whichever team you're on needs it, or repo creation fails even with a
valid, correctly-scoped token. Whoever creates the repo that way automatically
becomes an administrator *on that one repository* (see below) — that's a
repo-level grant, separate from whatever the team's own permissions say.

## Members and collaborators

There are two different paths to getting access to a single repository, and
it's easy to conflate them:

- **Team membership** — you're on a team, and that team has access to the repo
  (directly, or because it has access to the whole org). Your permissions on
  that repo come from the team's configuration.
- **Direct collaborator** — someone adds *you specifically* to *one* repo,
  independent of any team. This uses a simpler, four-level model: **Read**,
  **Write**, **Administrator**, **Owner**. The person who first creates a repo
  is its Owner by default.

The four collaborator levels roughly nest: Read can view/clone/pull and open
PRs; Write adds pushing directly and merging; Administrator adds
managing collaborators, branch protection, and repo settings; Owner adds the
danger-zone actions (transfer, delete, archive). A team granted "Administrator
access" gives its members the Admin level on every repo the team can reach —
not Owner, which stays tied to the org's Owners team (or, for a personal repo,
to your account).

## Visibility

Whether a repo is actually visible to someone depends on more than just the
repo's own private/public flag:

- If your (or the org's) profile visibility is **Limited**, all non-private
  repos are visible only to logged-in users — a logged-out visitor gets a plain
  404, indistinguishable from the repo not existing.
- If visibility is **Public**, non-private repos are visible to everyone.
- Marking a specific repo **Private** restricts it to collaborators regardless
  of profile visibility.
- Codeberg's Moderation Team and infrastructure admins retain access to private
  repos/profiles per the platform's privacy policy — private means private from
  other users, not from the platform operator.

## Invites

Adding someone to a team doesn't require them to already have a Codeberg
account — inviting by email works even for an address with no account yet;
they're prompted to create one when they accept. Adding by username requires
the account to already exist.

## Where this shows up in the tooling

- `REPO_OWNER` (`aliases.sh`) is the org or username repos get created under;
  `CODEBERG_REPO_SCOPE` picks which of the two API endpoints (`orgs/.../repos`
  vs `user/repos`) that maps to.
- `mkrepo`/`dk-scaffold` need the token's owner to be on a team with **create
  repositories** enabled for the target org — a correctly-scoped token alone
  isn't enough if team permissions don't allow it.
- `CODEBERG_TOKEN`'s scopes (`read:user`, `read:repository`, `write:repository`,
  `write:organization` — see [access-tokens.md](access-tokens.md#scopes)) are a
  separate axis from team/collaborator permissions: the token says what *the
  API call* is allowed to attempt, team/collaborator level says what *the
  account* is allowed to do. Both have to line up.
