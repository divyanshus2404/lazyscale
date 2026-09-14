// Parsing a forwarded enquiry.
//
// When a business forwards a customer's email to us, the envelope is theirs:
// From is the client, To is our address, and the person who actually wrote is
// named somewhere inside the body. Trusting the envelope means every reply goes
// to the client instead of the customer, so the original sender has to be
// recovered from the forward header that the mail client inserted.
//
// Gmail, Outlook, Apple Mail and Thunderbird each write that header differently,
// and localised clients translate the labels. What they agree on is a block near
// the top containing a From: line with an address in angle brackets.

const ADDR = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

// "Begin forwarded message", "---------- Forwarded message ---------",
// "-----Original Message-----", and the common localisations we can cover.
const FORWARD_MARKER = /^\s*(-{2,}\s*)?(begin forwarded message|forwarded message|original message|weitergeleitete nachricht|mensaje reenviado|message transféré)\b/im;
// Newer Outlook forwards carry no label at all: a rule of underscores, then
// From:/Sent:/To:/Subject:. Nothing above matches that, so those forwards fell
// straight through to the envelope — the client's own address in reply-to,
// which is the single failure this module exists to prevent.
//
// Detect the header block by its shape instead of its wording: a From: line
// with a Sent:/Date: line and a To:/Subject: line close under it. Requiring
// all three keeps a signature or a quoted "From the desk of" line out.
const HEADER_LABEL = '(from|von|de|da|expediteur|expéditeur)';
const FORWARD_BLOCK = new RegExp(
  '^[ \t>]*' + HEADER_LABEL + '\\s*:.*(?:\\r?\\n[ \t>]*[^\\n]*){0,3}' +
  '\\r?\\n[ \t>]*(sent|date|datum|enviado|envoyé|fecha)\\s*:',
  'im'
);
function forwardStart(body) {
  const labelled = FORWARD_MARKER.exec(body);
  if (labelled) return labelled.index;
  const block = FORWARD_BLOCK.exec(body);
  if (!block) return -1;
  // Only treat it as a forward when the block also names a recipient or a
  // subject: a From:/Date: pair alone shows up in pasted logs.
  const near = body.slice(block.index).split(/\r?\n/).slice(0, 8).join('\n');
  if (!/^[ \t>]*(to|subject|an|betreff|para|asunto|à|objet)\s*:/im.test(near)) return -1;
  return block.index;
}

// A From: line inside the forward block. Accepts "From: Name <a@b.com>",
// "From: a@b.com", and the localised label variants.
const FROM_LINE = /^[ \t>]*(?:from|von|de|da|från|fra)\s*:\s*(.+)$/im;
const NAME_ADDR = /^\s*"?([^"<]*?)"?\s*<\s*([^>]+)\s*>\s*$/;

const SUBJECT_LINE = /^[ \t>]*(?:subject|betreff|asunto|objet|assunto)\s*:\s*(.+)$/im;

function decodeEntities(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function looksForwarded(text) {
  return forwardStart(decodeEntities(String(text || ''))) !== -1;
}

// Pull the original sender out of the forward header. Returns null when the mail
// is not a forward, or when the block is there but unparseable — the caller
// should fall back to the envelope rather than guess.
export function originalSender(text) {
  const body = decodeEntities(text);
  const at = forwardStart(body);
  if (at === -1) return null;

  // Only look inside the header block: the first ~12 lines after the marker.
  // Searching the whole body would happily match a signature or a quoted thread.
  const after = body.slice(at).split(/\r?\n/).slice(0, 14).join('\n');
  const fromLine = FROM_LINE.exec(after);
  if (!fromLine) return null;

  const raw = fromLine[1].trim();
  const named = NAME_ADDR.exec(raw);
  if (named) {
    const email = named[2].trim();
    return ADDR.test(email) ? { name: named[1].trim(), email } : null;
  }
  const bare = ADDR.exec(raw);
  return bare ? { name: '', email: bare[1] } : null;
}

export function originalSubject(text) {
  const body = decodeEntities(text);
  const at = forwardStart(body);
  if (at === -1) return '';
  const after = body.slice(at).split(/\r?\n/).slice(0, 14).join('\n');
  const s = SUBJECT_LINE.exec(after);
  return s ? s[1].trim() : '';
}

// Everything the customer actually wrote, with the forward preamble and the
// trailing quoted thread removed. Falls back to the whole body rather than
// returning nothing, because a short message is better than none.
export function messageBody(text) {
  let body = decodeEntities(text).replace(/\r\n/g, '\n');

  // Find the marker's LINE, not the regex match offset: the leading \s* can
  // swallow the newline before it, which puts the match on the blank line above
  // and leaves the marker itself in the output.
  const lines = body.split('\n');
  let markerAt = lines.findIndex((l) => FORWARD_MARKER.test(l));
  if (markerAt === -1 && forwardStart(body) !== -1) {
    // Unlabelled Outlook block: the rule line above From:, or From: itself.
    const fromAt = lines.findIndex((l) => /^[ \t>]*(from|von|de)\s*:/i.test(l));
    if (fromAt !== -1) {
      markerAt = (fromAt > 0 && /^[ \t>]*[_-]{5,}\s*$/.test(lines[fromAt - 1])) ? fromAt - 1 : fromAt;
      // markerAt points at a line that is dropped before the header scan, so
      // when it is the From: line itself step back one to keep it in range.
      if (markerAt === fromAt) markerAt = Math.max(0, fromAt - 1);
    }
  }
  if (markerAt !== -1) {
    const rest = lines.slice(markerAt);
    // drop the marker line, then the header lines (From/To/Date/Subject/Cc...)
    let i = 1;
    while (i < rest.length && i < 16) {
      const line = rest[i].trim();
      if (!line) { i++; continue; }
      if (/^[ \t>]*(from|to|date|sent|subject|cc|reply-to|von|an|datum|betreff|de|para|fecha|asunto)\s*:/i.test(line)) { i++; continue; }
      break;
    }
    body = rest.slice(i).join('\n');
  }

  // cut a trailing quoted thread: "On <date>, X wrote:" or a run of "> " lines
  body = body.split(/\n[ \t>]*On .{4,80}\s+wrote:\s*\n/)[0];
  body = body.replace(/(\n[ \t]*>.*)+$/, '');
  // cut common signature delimiters
  body = body.split(/\n--\s*\n/)[0];

  const out = body.trim();
  return out || decodeEntities(text).trim();
}
