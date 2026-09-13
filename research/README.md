# The 11pm experiment

Message twenty businesses in one category, late at night, as a customer. Record
how long each takes to reply. Publish what you find.

It produces three things from one evening: a piece of original research nobody
else has, a proof point you own, and a list of prospects you have a true and
specific reason to contact.

---

## The rules

**One category, one area.** Twenty gyms in Indiranagar is a finding. Five gyms,
five salons and ten clinics is noise.

**Ask as a customer, because you are one.** You are genuinely asking about
membership. Do not mention LazyScale, do not mention automation, do not set a
trap. If they reply in four minutes, that is a real answer and it belongs in the
data.

**Send between 10:30 and 11:30pm**, on a weekday. Late enough that nobody is at a
desk, early enough that it is a normal hour to message a business.

**Same message to everyone.** Different questions produce different urgency and
the comparison stops meaning anything.

**Never publish a business name.** "20 gyms in Indiranagar" is research. "X Gym
took fourteen hours" is a public callout, it is unkind, and it costs you a client
you were about to approach. The report template has no field for a name and that
is deliberate.

**Log the ones that never reply.** They are the finding. A median calculated only
from businesses that replied is a lie by omission.

---

## The message

Send exactly this, changing only what fits the category:

> Hi, what are your membership rates? And are you open on Sundays?

For other categories:

| Category | Message |
|---|---|
| Salon | Hi, what do you charge for a haircut and colour? Do you take walk-ins on Sunday? |
| Clinic | Hi, what are your consultation charges, and is a doctor available on Sunday? |
| Coaching | Hi, what are the fees for the [class] batch, and when does the next one start? |
| Interior design | Hi, do you do full 2BHK interiors, and roughly what does that start at? |
| Real estate | Hi, do you have any 2BHK listings around [area] right now? |

Two questions, both easy, both requiring a real answer. One question is too easy
to answer with one word; three feels like a form.

---

## How to log it

Open `log.csv` in Sheets or Excel. One row per business.

| Column | What goes in it |
|---|---|
| `n` | 1 to 20. **No names.** |
| `channel` | instagram, whatsapp or website |
| `sent_at` | when you sent it, 24-hour time |
| `replied_at` | when they replied. **Leave blank if they never did.** |
| `minutes` | the gap. Leave blank for no reply. |
| `notes` | optional — "auto-reply only", "replied but ignored the question" |

An automated "thanks for your message, we'll get back to you" is **not a reply**.
Log it as no reply and note it. A holding message that never leads anywhere is
the exact thing you are selling against.

---

## Then publish it

Paste your rows into the `DATA` array at the bottom of `/response-times.html` and
the page computes everything itself — median, share that never replied, fastest,
slowest. It shows an empty state until real rows are in, and it will not invent a
number.

**Do not publish until you have run it.** A page of plausible-looking statistics
you did not measure is the one thing that would genuinely damage this business.

---

## The follow-up, a week later

To the ones who never replied:

> Hi — I messaged you about [rates] around 11pm last Tuesday and didn't hear back.
> No complaint, I was actually running a small test on how fast businesses around
> here reply at night.
>
> I build a thing that answers those in under a minute, any hour. Setting it up
> free for three businesses this month. Want me to do yours?

This is not a cold pitch. It is a true story where they already know the ending,
and it is the warmest opener you will ever get to a stranger.

To the ones who replied fast: leave them alone. They have already solved this,
and telling them otherwise is how you sound like every other agency.
