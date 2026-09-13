# The drop-in — onboarding a client in ten minutes

The entry product. A business points its existing website form at an endpoint, or
forwards enquiry email to one, and every enquiry is captured and pushed to them
within seconds.

**The point of it is what it does not ask for.** No password, no OAuth, no access
to an inbox or a CRM or a WhatsApp account. The delivery sequence in
[`README.md`](README.md) has credentials changing hands before the client has seen
anything work, and that is the step most likely to end the conversation. This
removes it entirely.

It also works with no `ANTHROPIC_API_KEY`: the enquiry is still captured and the
alert still goes out. The key adds scoring, a drafted reply, and — only if the
client asks — auto-reply. **So this is sellable today**, unlike everything else
that is waiting on the key.

---

## Onboarding, start to finish

### 1. Generate a key

```bash
openssl rand -hex 8
```

Anything matching `[A-Za-z0-9_-]{4,64}` works. One per client.

### 2. Add them to `TENANTS_JSON`

Vercel → Settings → Environment Variables. It is one JSON object holding every
client:

```json
{
  "a1b2c3d4e5f6a7b8": {
    "name": "Acme Interiors",
    "email": "owner@acme.in",
    "autoreply": false,
    "threshold": 11
  }
}
```

| Field | Meaning |
|---|---|
| `name` | Used in the model prompt, so replies sound like them |
| `email` | Where every alert goes. Required. |
| `autoreply` | `false` until they have read a week of alerts and asked for it |
| `threshold` | Score at or above which it may reply. Defaults to 11, i.e. never. |

**Redeploy after changing it.** Environment variables only apply to new deployments.

Client email addresses live in an env var rather than a repo file deliberately —
the repository is public and their contact details are not yours to publish.

### 3. Send them the setup link

```
https://lazyscale.vercel.app/setup.html?k=a1b2c3d4e5f6a7b8
```

The page shows their endpoint, the exact `<form>` line to paste, both setup
routes, and how to stop. There is nothing for you to explain on a call.

### 4. Watch them send a test

The setup page has a test button that posts a fake enquiry through the real path.
If it lands in their inbox, they are live.

---

## What to tell them, in order

1. **Nothing is sent to your customers.** To begin with it only forwards and
   summarises. Say this first — it is the objection underneath every other one.
2. **You can stop it in ten seconds** by changing the form action back or deleting
   the forwarding rule. Nothing to cancel, no account to close.
3. **Replies turn on later, if you want them**, and only for the straightforward
   enquiries, after you have read a week of them.

That third step is where this becomes a retainer rather than a free forwarder.
Do not rush it — the week of reading alerts is what earns the permission.

---

## Turning replies on

Set `autoreply: true` and drop `threshold` to about `8`. Four guards still have to
pass before anything sends: a usable draft, no escalation flag, a valid email
address, and a score at or above the threshold. A complaint, a price negotiation,
a question about an existing order, or an unparseable model response all escalate
instead of sending.

**Do not set the threshold below 8 until you have compared a month of scores
against what you would have done yourself.**

---

## Limits worth knowing before you promise anything

- **Email forwarding gives you a copy of the enquiry, not the thread.** Replies go
  out from your address with the client copied. It is honest and it works, but it
  is not the same as replying as them. Say so up front.
- **The throttle is per instance**, not global. It blunts a stuck form looping; it
  is not a defence against a determined attacker. The spend cap on the API key is
  the real backstop.
- **An unknown key returns 404.** If a client reports submissions vanishing, check
  the key in their form matches `TENANTS_JSON` exactly, and that you redeployed.
- **`TENANTS_JSON` has no size limit in practice, but it is not a database.** Past
  roughly ten clients, move it to Supabase — see [`../ROADMAP.md`](../ROADMAP.md).
