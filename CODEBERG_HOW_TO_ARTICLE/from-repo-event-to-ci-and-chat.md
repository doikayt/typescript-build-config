# From repo event to CI run (and a Discord ping)

One Codeberg event — a push, a PR opening, a PR merging — can fan out to more than
one place, via [webhooks](https://docs.codeberg.org/advanced/using-webhooks/). This
walks through what actually happens between "something happened in the repo" and "a
build ran" / "a message showed up in Discord."

## Before the first event: enabling the repo

A repo runs CI only after someone enables it at <https://ci.codeberg.org/repos/add>. That
one action is what creates the webhook the flow below starts from.

```text
  You (an approved Codeberg account)
          |  click "Enable" at ci.codeberg.org/repos/add
          v
  Woodpecker server (ci.codeberg.org)
          |  calls Codeberg's API as your account
          v
  Codeberg repository
          |  webhook added: target ci.codeberg.org/api/hook,
          |  with a per-repo secret Woodpecker generated
          v
  From here on, every push follows the flow below
```

- **Approval is per account.** Codeberg's volunteers approve a Codeberg account once. It
  can then enable any repository it has the rights to, including an organization's.
- **Enabling is per repository.** Each new repository needs its own click.
- **Woodpecker numbers each enabled repository.** The number is Woodpecker's own ID, not
  Codeberg's repository ID, and API calls use it (for example
  `https://ci.codeberg.org/api/repos/<id>/pipelines`). Look it up in the `id` field of
  `https://ci.codeberg.org/api/repos/lookup/<org>/<repo>`.
- **`dk-scaffold` does not enable the repo.** It creates the repository and pushes; both
  the access request and the enable step are manual.

## The flow

```text
                        Codeberg repository
                 (doikayt/typescript-build-config)
                               |
                       a repo event occurs
                (push, PR opened, PR merged, ...)
                               |
                               v
                  Forgejo checks the webhooks
                    configured for this repo
                               |
               +---------------+----------------+
               |                                |
               v                                v
   Webhook #1 -- type "Forgejo"      Webhook #2 -- type "Discord"
   target: ci.codeberg.org/api/hook  target: discord.com/api/webhooks/...
   auth:   ?access_token=<jwt>       auth:   token embedded in the URL
               |                                |
               v                                v
   +-------------------------+        Discord formats the payload
   |    Woodpecker server    |        into a chat message and posts
   |    (ci.codeberg.org)    |        it straight to the channel you
   |  - checks the token     |        picked when you created the hook
   |  - queues the pipeline  |                    |
   +------------+------------+                    v
                | gRPC                    #your-channel
                v                    "Pull request #42 opened: ..."
      +--------------------+
      |  Woodpecker agent  |
      |  pulls the queued  |
      |        job         |
      +---------+----------+
                |
                | runs each step of .woodpecker.yml
                v
     +-------------------------------+
     |  Docker container (step 1)    |   e.g. npm run ci
     +-------------------------------+
     |  Docker container (step 2)    |   e.g. changeset publish
     +-------------------------------+
                |
                v
      build status reported back to
      Codeberg -- shows as a check
        (pass/fail) on the commit/PR
```

## Reading it

- **One event, two independent webhooks.** Codeberg doesn't know or care that one
  webhook goes to CI and another goes to Discord — it just fires every
  [Forgejo webhook](https://forgejo.org/docs/latest/user/webhooks/) configured
  for the events it's set to trigger on. Deleting one has no effect on the other.
- **The CI token isn't your personal access token.** `CODEBERG_TOKEN` (the one used
  for `mkrepo`/`dk-scaffold`) authenticates *you* against Codeberg's API. The
  `access_token` embedded in the Woodpecker webhook URL is a different thing
  entirely: a per-repo secret Woodpecker generates itself the moment CI is
  activated for that repo, used only to trust incoming events as genuinely
  belonging to that repo. See [access-tokens.md](access-tokens.md) for the
  personal-token side of things.
- **The agent is what actually runs your pipeline**, not the server. Per
  [Woodpecker's architecture docs](https://woodpecker-ci.org/docs/administration/general),
  the server's job is auth + queueing; the agent pulls the job and executes each
  `.woodpecker.yml` step inside its own
  [Docker container](https://woodpecker-ci.org/docs/administration/configuration/backends/docker).
  This is also why [Codeberg's CI](https://docs.codeberg.org/ci/) only supports
  `linux/amd64` — the Docker backend needs a Linux host.
- **The Discord side never touches Woodpecker at all.** It's a completely separate
  branch straight from Forgejo to
  [Discord's own webhook endpoint](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
  If CI is down, Discord notifications still work, and vice versa.
