# Saftio × AUXIO — Safety & the Living Archive

*Design spec for moderation and community provenance across every ARCHAI public
conversational interface (AUXIO). This is the working home for the idea — edit freely.*

**Status:** design agreed, **not yet built**. The voice stack came first.
**Library:** [`rob-e-graham/safechat`](https://github.com/rob-e-graham/safechat) → "Saftio" (JavaScript, local, browser-capable, MIT-adjacent BSL-1.1).
**Applies to:** ACMI Object Wall, Heide, gallery `/aux`, and every future AUXIO page.

---

## Why

A public-facing museum AI creates a **new layer of visitor conversation**. That layer has to be:

- **Safe** — anyone in crisis reaches a human and real help, never an AI reply.
- **Respectful** — hate speech and culturally sensitive material are reviewed, not auto-published.
- **Valuable** — verified visitor knowledge becomes part of the record.

All processed **locally, on-device** (sovereign), with the **institution setting the rules**.

---

## What Saftio gives us (from the safechat library)

| Function | Use |
|---|---|
| `check(text)` | crisis level + recommended action + local help resources |
| `detectModeration(text)` | hate speech / threats |
| `getResources(country)` | crisis helplines (34 countries) |
| `promptOverride(level, country)` | make the AI stop and show help on crisis |

Local regex + optional ML embeddings. Browser build. Monitors **both visitor input and AI output**.

---

## The three safety categories (institution-configurable)

1. **Crisis / distress** → escalate to a human + show local help resources. The AI stops.
   *Never an AI reply to a crisis.*
2. **Hate speech / threats** → **held from public view** until curatorial review.
3. **Cultural sensitivity** *(new — configurable lexicon per protocols)* → held for **cultural review**
   (First Nations / ICIP, deceased persons warnings, sacred/secret or community-restricted material).

Each category has institution-set parameters: **sensitivity threshold**, **action**
(allow / hold-for-review / escalate), **custom lexicon**, and **reviewer routing**.

---

## "Leave a message" → the living archive

The Leave-a-message panel becomes **public**, gated by Saftio:

```
Visitor posts a message
        │
   Saftio.check() + detectModeration() + cultural check   (client-side, on-device)
        │
        ├─ clean, non-factual      → shown publicly (light review)
        ├─ crisis                  → NOT posted; help resources shown; staff flagged
        ├─ hate / threat           → held, not public; curatorial review
        ├─ culturally sensitive    → held; cultural review per protocols
        └─ factual claim           → routed to curators
                                       └─ if verified → ★ GREEN STAR +
                                          "This has been added to the object's archival metadata."
```

Verified visitor knowledge → **community-sourced provenance → the living archive**
(directly enacts *Cultivating a Living Archive*).

**The AI is checked too:** Saftio screens the model's own answers before they're shown or spoken.

---

## Where it lives

- **Client** — the Saftio browser library in each AUXIO page (Leave-a-message panel **and** the chat).
- **Staff app (ARCHAI)** — the **AUXIO Message Review** view: curators see every visitor
  message across AUXIO pages, with Saftio's flags (crisis / hate / cultural) surfaced.
  From here the team **approves held messages, routes crisis/cultural items, and verifies
  facts** — awarding the **★ green star**, which writes the fact into the object's metadata.
  The visitor wall only *displays* the ★ once curators grant it; verification never happens
  on the public page. Per-institution Saftio thresholds (hate / crisis / cultural) are set here too.

---

## Per-institution config (the institution owns the rules)

```json
{
  "crisis":   { "enabled": true, "sensitivity": "standard", "action": "escalate", "resources": "AU" },
  "hate":     { "enabled": true, "sensitivity": "standard", "action": "hold_for_review" },
  "cultural": { "enabled": true, "lexicon": ["…community terms…"], "action": "hold_for_cultural_review" },
  "facts":    { "verification": "curatorial", "reward": "green_star", "writeback": "object_metadata" }
}
```

---

## Phasing

1. **Demo mock** — front-end flow (public message → Saftio interstitials → green star). *For the ACMI pitch.*
2. **Real moderation** — safechat browser build doing live crisis + hate + cultural checks.
3. **Curatorial workflow** — review queue, cultural-review routing, verified-fact → metadata write-back.

---

## Why it matters for the ACMI conversation

- **Ethics + safety built in, not bolted on.**
- **Cultural protocols respected** (ACMI acknowledges the Traditional Custodians; aligns with ICIP).
- **The community becomes co-authors of the record** — the living archive.
- **Sovereign** — all local; the institution sets every threshold, lexicon and action.
