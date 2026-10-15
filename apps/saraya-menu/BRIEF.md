# BRIEF: Saraya Coffee House QR menu (Scroll Craft)

Interviewed in the project thread on 2026-10-15. The eight questions were asked in
one reply with a recommended answer each; Asem answered one (the cafe name) and the
rest run on the recommended answers, which are marked **Default (recommended, not
objected to)**. Asem's own words are quoted.

## Context from the request

- A sales demo for restaurant owners in Libya: a mobile-first, bilingual (Arabic
  RTL first, English) QR digital menu for a fictional Libyan cafe. Categories,
  items with LYD prices, real imagery, a WhatsApp order button. Premium and fast.
  Static. (Coordinator brief.)
- Asem: "You can also use Unsplash for images. The website should have images and
  stuff in it."
- Asem, on the first name (Nakhla): "change [it] to something else that should look
  premium." Chosen: **سرايا · Saraya Coffee House**, after Tripoli's Red Castle.

## Revision, 2026-10-15

Asem, after the first version: "صورة الـسفنز اللي حاطها مش سفنز، تنحي سفنز من الـ menu
كاملة، ونحي طلبات الـ order بالـ WhatsApp، وخلي تركيزك كله على شكل الـ menu وحلاوتها"
(the sfinz photo is not sfinz, remove sfinz entirely, remove WhatsApp ordering, put all
the focus on how the menu looks).

So answers 2, 4 and 5 below are superseded: there is no tray, no order and no WhatsApp.
The journey is now arrival, category strip, the menu read as a printed carte (name, dotted
leader, price), and any dish opened full frame. The grammar moves from live surface to
**gallery / catalog**, the signature move is now **the dish opens from its row**, and the
peak is the first dish that opens. The sections below record the original interview.

## The eight questions

1. **Vibe and references.** Default: Tripoli morning, warm stone, unhurried luxury.
   References: the Libyan macchiato in a small glass, Ghadames' red-painted
   interiors, a 1960s Italian espresso bar.
2. **Journey.** Default: the cafe greets you with "open now" and your table, then
   the category strip, then items with photos and prices, then the tray filling,
   then the order goes out on WhatsApp.
3. **Energy curve.** Default: calm browsing, one lively moment when the first item
   lands in the tray, calm again for review, a clean decisive send.
4. **Feeling and the one moment.** Default: appetite, then ease, then "that was
   quick". The moment: watching the WhatsApp message write itself as you tap.
5. **The thing no other menu does.** Default: the order writes itself. A live
   message bubble composes the order in the visitor's language with the table
   number from the QR code, and Send opens WhatsApp with it filled in.
6. **Distance from premium-minimal.** Default: warm editorial. Premium, with
   Libyan texture, not sterile.
7. **One world or distinct scenes.** Default: neither. The page is the working
   menu (live surface grammar).
8. **Assets.** None supplied. Real food photography from Unsplash (Asem approved
   Unsplash), served from Unsplash's image CDN with credits on the page.

## Feeling curve, current (one line per beat)

| Beat | Feeling | Caused by |
|---|---|---|
| Arrival | Welcomed, "this place is real" | Arched courtyard photo, Ghadames pattern band and the cafe card on three planes at three speeds; "Slow coffee, under the arches"; live Tripoli open status; the table from the QR link |
| Browse | Appetite, calm | A printed carte: name, dotted leader, price; photos on the trailing side; one full-frame house dish per section; rows rising in once as they arrive |
| First dish opened (peak) | Delight | The row's photo grows into a full-frame view of the dish, with its name, price and story |
| Wander | Pleasure, no effort | Swipe or tap to the next dish; the photo morphs from one dish to the next across the whole menu |
| Return | Oriented | Closing shrinks the photo back into the row of the dish you ended on |

**Peak:** "I tapped the shakshouka and the photo just opened up to fill the screen." It
gets the only shared-element motion on the page.

**Tell-someone sentence:** "It's the menu where every dish opens up like a photo you
can swipe through."

## Feeling curve, first version (superseded)

| Beat | Feeling | Caused by |
|---|---|---|
| Arrival | Welcomed, "this place is real" | Arched courtyard photo behind a Ghadames pattern band, the cafe's card overlapping both, "Open now" computed from Tripoli time, "Table 7" from the QR link |
| Browse | Appetite, ease | Full-colour photos, one clean label schema per item, prices that read at a glance, a category strip that follows you |
| First add (peak) | Delight | The photo lifts off the row and drops into the tray, the tray bar rises, and the message bubble starts writing the first line |
| Review | Control, trust | Steppers, a note field, a running total, the bubble rewriting each line as quantities change |
| Send | "That was quick" | One button opens WhatsApp with the whole order, table included |

**Peak:** "I tapped a macchiato and watched the WhatsApp message write itself, with
my table number already on it." Lives in the First add beat. It gets the largest
visual change on the page (the only flying element, the only bar that rises).

**Tell-someone sentence:** "It's the menu where your WhatsApp order writes itself
while you choose."

**Authored silence:** none. The menu never holds the scroll; nothing is pinned
except the category strip, which is navigation.

## Grammar and gate, current

- **Grammar: Gallery / catalog.** A menu is the grammar's own example. One label schema
  for every dish (name, price, a factual line, the serving), facts not pitch, an index of
  categories that jumps, the collection starting right under the arrival. Gallery is
  also the Wasma studio site's grammar, so the gate rests on the other five dimensions.
- **Nav:** sticky category strip with scrollspy and a language link.
- **Hero:** three planes (courtyard photo, Ghadames band, the cafe card) at three speeds.
- **Close:** the last collection (sweets), then a colophon footer with credits.
- **Signature move:** the dish opens from its row. A same-document view transition
  grows the row photo into the full item view, morphs dish to dish as the visitor
  swipes, and shrinks back into the row they finish on. Reduced motion gets the same
  view with no travel.

## Grammar and gate, first version (superseded)

- **Grammar: Live surface.** The demo is the argument: a restaurant owner should
  operate the real thing. Copy lives in the surface's idiom (labels, status lines,
  an empty state). The honesty rule holds: every panel computes from the data in
  `menu.js`, and the page says on its face that the cafe and prices are fictional.
  The other seven lost: a filmic one-shot, a continuous world, a split stage or a
  cutlist would put a film between a hungry customer and the menu; a typographic
  poster throws away the photography Asem asked for; chaptered editorial is for
  reading, not ordering; gallery is the closest fit but is already taken by the
  Wasma studio site.
- **Nav:** app chrome. A sticky category tab strip with scrollspy, a table chip and
  a language switch. No marketing bar.
- **Hero:** the surface already in a state. Three planes: the arched courtyard photo
  (far, slowest), a Ghadames pattern band (mid, its own alpha vector), the cafe
  card with live status (near, overlapping the band).
- **Close:** an actual input. The tray: steppers, table field, note field, Send.
- **Signature move:** the self-writing order bubble. Each change to the tray
  re-types only the line that changed, in the visitor's language, and the bubble is
  exactly the text that WhatsApp receives.
- **Engine:** not used. Live surface bans `scrub`, `kinetic`, `spotlight` and long
  `drift`; the only devices left are a sticky strip and small page-local motion, so
  shipping 80 KB of engine to phones on Libyan mobile data would cost speed for
  nothing.
