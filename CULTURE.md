# How We Work With AI

AI enables us, as engineers, to design solutions at a higher level of abstraction. It
flattens the learning curve and allows us to orchestrate the production of new, useful
functionality without getting bogged down in the details of any particular framework
or language. But if we let AI do the bulk of the exploratory work — the grunt work of
roughing out a first spike, finding bugs, generating documentation — does that mean
we're lazy distributors of AI slop?

No. Why?

Because:

- **[We understand Before Using](#understand-before-using)** — we never blindly accept
  what the AI gives us without taking the time to understand it first.
- **[We teach It Forward](#teach-it-forward)** — we write up 'backgrounders' on new concepts we're just getting
  comfortable with, because those same concepts will likely be unfamiliar to colleagues onboarding later,
  and to 'future us'.
- **[We begin With the End User in Mind](#begin-with-the-end-user-in-mind)** — we
  start by describing the system from the end user's perspective, the highest level of abstraction
  that actually matters.

## Understand Before Using

We never blindly accept what the AI gives us without taking the time to understand it
first.

First, we look at the solution the AI produced and  ask it to explain  any unfamiliar
terminology in comments, and unfamiliar syntax patterns in key parts of the code.
Does that mean we scrutinize every numeric value in, say, some CSS the AI dumped out?
Since our attention is limited, probably not — CSS gone wrong is at
worst a rendering issue on one page -- not something that would kneecap an app completely.
Taking the AI's word for it is relatively low risk in these scenarios.

## Teach It Forward

As we write new functionality, we realize that any associated concepts that are new to us, 
(be they related to new progamming languages, frameworks, or whatever)
might also be unfamiliar to colleagues onboarding later on down the
line. So we  put in the extra effort to write up 'backgrounders' about these 
new concepts for the benefit of those prospective future
colleagues, as well as 'future us'.

The ideal is to be able to explain to a new colleague, in your own words, what the key
elements of the background technology are. This also helps 'future you', once the
reasoning that made sense today has faded from memory.

Turns out "wired into memory" isn't just a turn of phrase. When mice learned to
associate two sensory signals, the neurons encoding that association grew more
synapses and became more excitable — the connections were, quite literally, wired in
([Li et al., 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10308380/)).

The same principle shows up behaviorally. Explaining something in your own words taps
the *generation effect*: information you generate yourself is remembered better than
information you just read
([Slamecka & Graf, 1978](https://doi.org/10.1037/0278-7393.4.6.592)). And writing it up
for someone else — even a future colleague you'll never meet — taps the *protégé
effect*: expecting to teach material improves how well you learn it yourself
([Nestojko et al., 2014](https://doi.org/10.3758/s13421-014-0416-z)).

The best way we've found to put this to work is by:

- explaining the new concept your code depends on in your own words (building on, and refining the initial AI slop explanation)
- connecting the new idea to another idea — and what better idea to connect it to than
  the actual code you're in the process of developing?

That second point is the whole reason the case study below matters: a backgrounder
that never points at the code it explains is much easier to let go stale.

## Begin With the End User in Mind

Documentation-first is just one aspect of the more general rule we follow: [Begin with
the End in Mind](https://www.goodreads.com/quotes/1401614-to-begin-with-the-end-in-mind-means-to-start).
We approach things from the end user's perspective, the highest level of abstraction
that actually matters, and do documentation first.

There's a payoff to this beyond clarity. When you sketch out the end state first, you
often see early that some of your assumptions lead nowhere — and you get to abandon
those before you've sunk real time building on top of them.

Having AI do that first sketch changes the economics of this. It's a bit like dumping
your preferred colors onto a canvas with a rough idea of what the shapes might be, and
letting AI handle the arrangement. Once the picture is roughed out, you can step back
from the canvas and decide: maybe this needs a whole new shape, or maybe the shapes
just need to be in a different order. Because the first draft was cheap, changing your
mind about it is cheap too.

Concretely: when you're learning something new, stuck, or working slightly outside
your comfort zone, build the documentation *during* the session, not as cleanup
afterward. The write-up isn't a summary of what happened. It's what makes the next
person's version of this problem take ten minutes instead of two hours.

## Case study: linking backgrounders to code

Here's the best example we've found of doing this well:
[`gas-demodulify-plugin`](https://github.com/doikayt/gas-demodulify-plugin)'s design
doc. Its backgrounder,
[`docs/plugin-design.md`](https://github.com/doikayt/gas-demodulify-plugin/blob/main/docs/plugin-design.md),
walks through *why* the plugin needs to reach into Webpack's internal `RuntimeSpec`
type — and then just links straight down to the file that does it:

> The core logic responsible for emitting GAS-safe output lives in
> [CodeEmitter.ts](../src/plugin/code-emission/CodeEmitter.ts)...

And the code links back. Sitting right on the `WebpackRuntimeSpec` type in
[`CodeEmitter.ts`](https://github.com/doikayt/gas-demodulify-plugin/blob/main/src/plugin/code-emission/CodeEmitter.ts)
is a doc comment pointing at the exact section of the backgrounder that explains why
it exists:

```typescript
/**
 * Webpack's internal structure encoding a runtime specification.
 *
 * See:
 * https://github.com/doikayt/gas-demodulify-plugin/blob/main/docs/plugin-design.md#rationale-for-referencing-webpacks-internal-runtimespec
 */
type WebpackRuntimeSpec = Parameters<import("webpack").CodeGenerationResults["get"]>[1];
```

Notice two things here. First, two different link styles for two different jobs: a
plain relative link when pointing at a whole file that isn't going anywhere, and a
commit-pinned permalink down to exact line numbers when the claim is precise enough
that a refactor could make it stale. Second, the backgrounder doesn't try to explain
everything itself — it says outright that the *why* lives in the doc and the *precise
invariants* live in the source file's own comments. One altitude per document,
cross-linked, so you can start reading from either end and still land in the same
place.

## Putting this into practice

- Ask the concrete question, not the abstract one. "If I run this command, what
  folder does it end up in?" gets you further than "how does the tool work?" —
  concrete questions get you answers you can actually check.
- Verify, don't just recall. Check the answer against the real source, the real API
  response, the real docs — don't take an answer just because it sounds right.
- When a decision actually has weight, lay out the trade-offs instead of quietly
  picking one. Decide together, and leave the reasoning on record.
- Write down the decision *and* the why, not just the what, somewhere durable. Chat is
  great for thinking out loud, but it's not where the org's knowledge should end up
  living.
- Link the backgrounder to the code it explains, in both directions — the way
  `plugin-design.md` and `CodeEmitter.ts` do above.
- Keep the meta-conversation about how we work separate from the thing we're actually
  building. (This article is a good example of that split in action.)
- The real test of a doc is running it, not reviewing it. Whatever trips you up while
  following it is a bug in the doc, not just bad luck.
- Say what's confirmed and what's still a guess. Nobody's helped by a doc that sounds
  more certain than it actually is.
- Don't let unrelated stuff you notice along the way slide. Found a stale comment, or
  a doc that contradicts the code? Flag it, fix it separately, and move on.

If you had to stop and work something out — even something small — ask yourself:
would a colleague hit this same wall? If yes, leave a marker before moving on: a doc,
a comment linking to the doc, or both. Assume others will retrace your steps, and make
sure there's a trail for them to follow.

## Where write-ups live

For now, these write-ups live as markdown, right in the repo, close to the code they
explain — see [`CODEBERG_HOW_TO_ARTICLE/`](CODEBERG_HOW_TO_ARTICLE/) for an example.
Our audience today is local devs, so that's good enough. Turning these into something
else for a wider audience is a problem for later — it's not a reason to put off
writing the doc now.
