---
name: ac-getting-started
description: Set up the builders.ac outbound kit, connect builders.ac and Treg, and turn a company website into a confirmed offer and ideal-customer targeting brief. Use for onboarding, connection troubleshooting, or choosing whom to target before prospecting.
---

# Get started with builders.ac

Help the user reach a concrete starting point: working connections, a confirmed
offer, and a targeting brief they understand. Use everyday language; introduce
"ideal customer profile (ICP)" only when useful.

## Connect

Reuse working tools in the current session. If either service is unavailable,
follow [connections.md](references/connections.md). Configuration, authentication,
and successful tool calls are different states; report only what you observed.
Honor a request to prepare files without signing in. Never ask for secrets in chat.

After both services return successful read-only tool results, ask:
"Your accounts are connected. What's your company's website?"
If the user already supplied the website, use it rather than asking again.
If authentication is deferred, you can still discuss targeting when requested;
do not imply the accounts are connected.

## Understand the business

Follow [targeting.md](references/targeting.md) to research the website, confirm
the offer, present plausible customer segments, and refine the user's selection
with short multiple-choice questions. An ICP is a segment definition; a prospect
is an actual company or person. Do not present invented prospects as search results.

Save the confirmed targeting brief under `runs/<descriptive-name>/brief.md`.
This folder is private local output and is ignored by Git. Do not put credentials
or raw tool responses in it. Existing briefs should be updated, not overwritten
with assumptions or duplicated at every restart.

End with the selected segment, the business reason for it, unresolved inputs,
and the next proposed step: a small prospect sample. This version does not
implement prospect sourcing, verification, provisioning, or campaign launch.
Do not claim those operations occurred or install another integration to fill
the gap without explaining the additional scope.
