# Setting up Codeberg for a team, from scratch

A complete walkthrough that starts with no Codeberg account and ends with team members
creating and pushing projects with `dk-scaffold`. It covers creating the organization and
team, inviting people, and setting up each person's account and machine.

Placeholders used throughout: 
    - `<org>` is your organization's name, 
    - `<team>` is the team name, 
    - `<username>` is a person's Codeberg username, and 
    - `<token>` is a personal access token.

Background on why each person gets their own token is in
[access-tokens.md](access-tokens.md).

<!-- TOC:START -->
- [Setting up Codeberg for a team, from scratch](#setting-up-codeberg-for-a-team-from-scratch)
  - [Who does what](#who-does-what)
  - [Prerequisites](#prerequisites)
  - [Part 1: register a Codeberg account (everyone, first)](#part-1-register-a-codeberg-account-everyone-first)
  - [Part 2: the org owner creates the organization and team](#part-2-the-org-owner-creates-the-organization-and-team)
  - [Part 3: each person, on Codeberg](#part-3-each-person-on-codeberg)
  - [Part 4: each person, on their machine](#part-4-each-person-on-their-machine)
  - [Part 5: continuous integration (optional)](#part-5-continuous-integration-optional)
  - [Troubleshooting](#troubleshooting)
  - [Offboarding](#offboarding)
<!-- TOC:END -->

## Who does what

| Role | Does |
|---|---|
| Org owner | Creates the organization and team (once), then adds each new person |
| Team member | Registers, adds an SSH key, generates their own token, sets up their machine |

The org owner is the person who created the organization. Codeberg adds the creator to the
organization's `Owners` team automatically (Part 2, step 1). They are also a team member,
so they follow Parts 3 and 4 for themselves too.
Part 1 is the first step for anyone who has never used Codeberg, whether org owner or
team member.
Repos are always created under an organization, never a personal account. If you work alone,
create a one-person organization (free) and follow the same steps.

## Prerequisites

Every person's machine needs:

- `git`
- Node.js 22 or newer
- an OpenSSH client (`ssh`, `ssh-keygen`) and `curl`
- a web browser
- a password manager for the token (Bitwarden, for example)
- an email address

## Part 1: register a Codeberg account (everyone, first)

Everyone does this first, from the org owner to every team member. It is the first thing a
person who has never used Codeberg must do. It creates a personal account only. The
organization is created in Part 2 by the org owner.

1. Go to <https://codeberg.org/user/sign_up> (the **Register** page).
2. Enter a username, an email address and a password.
3. Open the confirmation email Codeberg sends and click the link. The account is not
   usable until the address is confirmed.
4. Recommended: turn on two-factor authentication now. Codeberg's guide is at
   <https://docs.codeberg.org/security/2fa/>.
5. If you are creating the organization yourself, skip this step and continue to Part 2:
   you are the org owner, so there is no one to contact. Otherwise, send the org owner your
   Codeberg username (`<username>`), or the email address to invite, through whatever
   channel the team already uses (chat or email, for example). The org owner is the person
   who created the organization in Part 2. Your username and email address are not secret.
   Your username is the last part of your profile URL, `https://codeberg.org/<username>`.
   Never send a password or a token. The owner adds you in Part 2, step 3 (by username) or
   step 4 (by email).

Codeberg is a non-profit, volunteer-run service. Its terms ask users to keep resource use
reasonable, which matters for the CI section below.

## Part 2: the org owner creates the organization and team

Skip steps 1 and 2 if the organization and a suitable team already exist.

1. **Create the organization.** Open <https://codeberg.org/org/create> (the `+` menu,
   **New Organization**). Enter `<org>` as the name, choose the visibility, and
   click **Create Organization**. The name becomes the org's URL, and later the value of
   `REPO_OWNER`. Codeberg creates an `Owners` team containing _you_ automatically.
2. **Create a team for people who create repos.** Open
   `https://codeberg.org/org/<org>/teams/new` (the org's **Teams** page, **New Team**; if
   you don't remember the org's name, see "Finding your organizations and teams" below).
   Name it `<team>`, then set:
   - repository access: all repositories of the organization, unless you want to add
     repositories to the team one at a time
   - permission: **Write** access. `Administrator Access` is more than `mkrepo` needs.
   - **Create repositories**: tick the box that lets members create repositories on behalf
     of the organization. Without it, `mkrepo` fails for that member.
3. **Add a member.** Open `https://codeberg.org/org/<org>/teams` (the org's **Teams** tab)
   and click **View** on the team's card. On the team page, type the person's `<username>`
   in **Search users…**, pick them from the list, and click **Invite to team**. The
   invitation stays under **Pending invitations** on the team page until the person
   accepts it.
4. **Or invite by email.** On the same team page, type an email address in the same box
   and click **Invite to team**. The address may belong to someone with no Codeberg
   account yet, who is then prompted to create one first. Until accepted, the invitation
   appears under **Pending invitations**, next to a **Remove** button.

After adding someone by either route, tell them the value of `<org>`. They need it for
`REPO_OWNER` in Part 4, step 4.

**Finding your organizations and teams**

- Organizations you own or belong to: <https://codeberg.org/user/settings/organization>
  (profile picture, **Settings**, **Organizations**).
- Teams in an organization: `https://codeberg.org/org/<org>/teams`. Click a team to see
  its members and repositories.

Only members of the `Owners` team can manage teams, add or remove members and set access
rights. A member who creates a repository in the org becomes a collaborator with
administrator rights on that repository.

## Part 3: each person, on Codeberg

1. **Add an SSH key.** Git pushes authenticate with this key, not with the token.
   - On your machine, generate a key if you don't have one (accept the default file
     location; a passphrase is recommended), then print the public half:

     ```bash
     ssh-keygen -t ed25519 -C "you@example.com"
     cat ~/.ssh/id_ed25519.pub
     ```

     If `~/.ssh/id_ed25519.pub` already exists, you may wish to skip `ssh-keygen` and reuse
     that key: when the file exists, `ssh-keygen` asks whether to overwrite it, and
     answering yes destroys the old key.

   - On Codeberg, open <https://codeberg.org/user/settings/keys> (profile picture,
     **Settings**, **SSH / GPG keys**). Under **Add Key**, paste the whole `cat` output
     (one line starting with `ssh-ed25519`), give it a name, and save. Never paste the file
     without the `.pub` extension: that is the private key.
   - Verifying the key is optional and matters only for signed commits.
2. **Generate a personal access token.** Open
   <https://codeberg.org/user/settings/applications> (profile picture, **Settings**,
   **Applications**). Under **Manage Access Tokens | Generate New Token**, enter a name,
   select these scopes, and generate the token:
   - `read:user`
   - `read:repository`
   - `write:repository`
   - `write:organization`
3. **Copy the token immediately** and save it in the password manager. Codeberg shows it
   only once. Suggested item name: `Codeberg token: <purpose>`.

Access tokens grant access to your account, so treat them like a password. Delete a token
you no longer use.

## Part 4: each person, on their machine

1. **Git identity.** This is required, because the scaffold makes a commit:

   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

2. **Check the SSH key** you added in Part 3, step 1:

   ```bash
   ssh -T git@codeberg.org
   ```

   A greeting containing your username means it works.

3. **Install the shell aliases**, once per machine. Clone the tool's repository (its URL is
   in the tool's README), then run its installer from the clone:

   ```bash
   git clone https://codeberg.org/doikayt/typescript-build-config.git
   cd typescript-build-config
   ./assets/shell/install.sh
   exec $SHELL
   ```

   On an account with no `~/.bashrc`, the script creates one.

4. **Set the token and owner** for the current shell:

   ```bash
   export CODEBERG_TOKEN=<token>
   export REPO_OWNER=<org>
   ```

5. **Check the token.** A valid token with `read:user` returns 200. A 403 means a scope is
   missing, and the response body names it. A 401 means the token is invalid.

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     -H "Authorization: token $CODEBERG_TOKEN" https://codeberg.org/api/v1/user
   ```

6. **Try it.** `dk-scaffold my-demo --local` scaffolds and tests a project with no Codeberg
   involvement, and confirms the tool itself works. Then `mkrepo my-demo` tests the token
   and team permission on their own. `dk-scaffold my-demo` runs the full flow: create the
   repo, scaffold, and push over SSH.

Repos created by `mkrepo` are public.

## Part 5: continuous integration (optional)

`dk-scaffold` creates and pushes without CI, so this part is optional. It is only needed
for the scaffolded project's pipeline to run on Codeberg.

Codeberg provides Woodpecker CI at `https://ci.codeberg.org`. Access is not automatic.

1. **Request access** with the Woodpecker CI request form linked from Codeberg's CI
   documentation (`https://docs.codeberg.org/ci/`). A Codeberg volunteer reviews it against
   published criteria, so read those first to speed up approval.
2. **Log in** at `https://ci.codeberg.org` with your Codeberg account once approved.
3. **Enable the repository** at `https://ci.codeberg.org/repos/add`.

Things to know before relying on it:

- Codeberg documents its CI as provided as-is, with no guarantee of availability, and asks
  for reasonable resource use.
- Woodpecker has limited role-based access control, which Codeberg notes can be awkward for
  projects with team-based permissions. Plan for the person who enables a repository to be
  the one who manages its CI settings.
- Only `linux/amd64` builds are supported.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `mkrepo` fails with a permission error | The team lacks the **Create repositories** box, or the token lacks `write:organization` |
| 403 from `/user` | The token lacks `read:user` |
| 401 from any call | The token is wrong, revoked, or was copied incompletely |
| `ssh -T` fails | The public key is not on the account, or a different key file is in use |
| `dk-scaffold` reports a missing git identity | Set `user.name` and `user.email` (Part 4, step 1) |
| Push fails after the repo was created | The SSH key is missing, or the member lacks write access |
| No CI runs after pushing | CI access not approved, or the repo not enabled at `ci.codeberg.org/repos/add` |

## Offboarding

Remove the person from their team, or from the organization. Nothing shared needs rotating,
because each person holds only their own token. Ask them to delete their token in their own
Codeberg settings.
