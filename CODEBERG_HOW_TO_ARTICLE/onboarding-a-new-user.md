# Setting up Codeberg for a team, from scratch

A complete walkthrough that starts with no Codeberg account and ends with team members
creating and pushing projects with `dk-scaffold`. It covers creating the organization and
team, inviting people, and setting up each person's account and machine.

Placeholders used throughout: `<org>` is your organization's name, `<team>` is the team
name, `<username>` is a person's Codeberg username, and `<token>` is a personal access
token.

Background on why each person gets their own token is in
[access-tokens.md](access-tokens.md).

## Who does what

| Role | Does |
|---|---|
| Org owner | Creates the organization and team (once), then adds each new person |
| Team member | Registers, adds an SSH key, generates their own token, sets up their machine |

The org owner is also a team member, so they follow Parts 3 and 4 for themselves too.
Part 1 is the first step for anyone who has never used Codeberg, owner or member.

## Choose a setup

- **Organization with a team** (two or more people): follow Parts 1 to 4.
- **Just you, on a personal account:** follow Parts 1, 3 and 4, and skip Part 2. In Part 4
  set `REPO_OWNER` to your own username and also set `CODEBERG_REPO_SCOPE=user`, so repos
  are created under your account instead of an organization.

## Prerequisites

Every person's machine needs:

- `git`
- Node.js 22 or newer
- an OpenSSH client (`ssh`, `ssh-keygen`) and `curl`
- a web browser
- a password manager for the token (Bitwarden, for example)
- an email address they can receive mail at

## Part 1: register a Codeberg account (everyone, first)

This is the first thing a person who has never used Codeberg must do.

1. Go to `https://codeberg.org` and click **Register**.
2. Enter a username, an email address and a password.
3. Open the confirmation email Codeberg sends and click the link. The account is not
   usable until the address is confirmed.
4. Recommended: turn on two-factor authentication now. Codeberg's guide is at
   `https://docs.codeberg.org/security/2fa`.
5. New members: send the org owner your `<username>`, or give them your email address so
   they can invite you (Part 2, step 4).

Codeberg is a non-profit, volunteer-run service. Its terms ask users to keep resource use
reasonable, which matters for the CI section below.

## Part 2: the org owner creates the organization and team

Skip steps 1 and 2 if the organization and a suitable team already exist.

1. **Create the organization.** On the dashboard, click the `+` next to your avatar and
   choose **New Organization**. Enter `<org>` as the name, choose the visibility, and
   click **Create Organization**. The name becomes the org's URL, and later the value of
   `REPO_OWNER`. Codeberg creates an `Owners` team containing you automatically.
2. **Create a team for people who create repos.** Open the org, go to **Teams**, and click
   **New Team**. Name it `<team>`, then set:
   - repository access: all repositories of the organization, unless you want to add
     repositories to the team one at a time
   - permission: **Write** access. `Administrator Access` is more than `mkrepo` needs.
   - **Create repositories**: tick the box that lets members create repositories on behalf
     of the organization. Without it, `mkrepo` fails for that member.
3. **Add a member.** Open the team, choose **Settings**, and add the person by
   `<username>`.
4. **Or invite by email.** The same page can invite by email address, including an address
   with no Codeberg account yet. The person is prompted to create an account first.

Only members of the `Owners` team can manage teams, add or remove members and set access
rights. A member who creates a repository in the org becomes a collaborator with
administrator rights on that repository.

## Part 3: each person, on Codeberg

1. **Add an SSH key.** Click your profile picture, then **Settings**, then
   **SSH / GPG keys**. Git pushes authenticate with this key, not with the token. Verifying
   the key is optional and matters only for signed commits.
2. **Generate a personal access token.** In **Settings**, open **Applications**. Under
   **Manage Access Tokens | Generate New Token**, enter a name, select these scopes, and
   generate the token:
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

2. **SSH key**, if the machine has none:

   ```bash
   ssh-keygen -t ed25519
   ```

   Paste `~/.ssh/id_ed25519.pub` into Codeberg (Part 3, step 1), then check it:

   ```bash
   ssh -T git@codeberg.org
   ```

   A greeting containing your username means it works.

3. **Install the shell aliases**, once per machine. Clone the tool's repository (its URL is
   in the tool's README), then run its installer from the clone:

   ```bash
   git clone <tool-repo-url>
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

   For a personal account, use `REPO_OWNER=<username>` and also
   `export CODEBERG_REPO_SCOPE=user`.

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
| `mkrepo` fails for a personal account | `CODEBERG_REPO_SCOPE=user` is not set |
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
