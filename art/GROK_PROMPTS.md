# Character art with Grok

Goal: 4 girls × 6 expressions (24 images) + 1 app icon, all in one consistent anime style.

## How to keep each girl looking the same

1. Make **one base portrait** per girl with the prompt in "Base portrait" below. Generate a few and pick the best one.
2. For each expression, open that base image in Grok and use **Edit image**, pasting the expression prompt. Always edit the **base** image, not an already-edited one, so the face doesn't drift.
3. If a result looks younger than an adult, has the wrong hair or outfit, or has text or a watermark, regenerate it.

## Image rules (all images)

- Square (1:1), at least 1024 × 1024
- Head and shoulders, face centered, looking at the viewer unless the prompt says otherwise
- Plain soft pastel background in the girl's color (given below), no scenery, no text, no logo
- Clean modern anime cel-shading, soft lighting, the same style for all four girls
- All characters are adults (early twenties) with modest, casual clothes

## Where to save

Save the files into `senpai-says/art/raw/` with these exact names:

```
hana_love.png   hana_angry.png   hana_miss.png   hana_shy.png   hana_night.png   hana_call.png
rei_love.png    rei_angry.png    rei_miss.png    rei_shy.png    rei_night.png    rei_call.png
aiko_love.png   aiko_angry.png   aiko_miss.png   aiko_shy.png   aiko_night.png   aiko_call.png
yui_love.png    yui_angry.png    yui_miss.png    yui_shy.png    yui_night.png    yui_call.png
icon.png
```

Then tell me. I'll crop, resize and compress them and put them in the app.

---

## Base portraits

**Hana** (shy, gentle). Background `#FBEAF0` (soft pink)
> Anime-style portrait of an original adult woman in her early twenties named Hana. Long soft pastel-pink hair with a loose side braid over her right shoulder, gentle pink-violet eyes, a small white flower hair clip on the right side. Wearing a cream knit cardigan over a white blouse. Shy, gentle personality, soft warm smile. Head and shoulders, centered, facing the viewer. Plain soft pink background (#FBEAF0). Clean modern anime cel-shading, soft lighting, high detail, no text, no watermark.

**Rei** (calm, cool). Background `#EEEDFE` (soft lavender)
> Anime-style portrait of an original adult woman about 21 named Rei. Sleek dark navy hair tied in a low ponytail with straight-cut bangs, calm violet-blue eyes, small silver stud earrings. Wearing a black turtleneck with a dark red scarf. Calm, cool, reserved expression with a very slight smile. Head and shoulders, centered, facing the viewer. Plain soft lavender background (#EEEDFE). Clean modern anime cel-shading, soft lighting, high detail, no text, no watermark.

**Aiko** (tsundere, feisty). Background `#FAECE7` (soft peach)
> Anime-style portrait of an original adult woman about 20 named Aiko. Bright orange-red hair in twin tails tied with red ribbons, sharp teal-green eyes. Wearing a casual white hoodie with red trim. Feisty tsundere personality, confident slightly smug expression. Head and shoulders, centered, facing the viewer. Plain soft peach background (#FAECE7). Clean modern anime cel-shading, soft lighting, high detail, no text, no watermark.

**Yui** (bubbly, energetic). Background `#FAEEDA` (soft cream-yellow)
> Anime-style portrait of an original adult woman about 20 named Yui. Golden-blonde hair in a high side ponytail with a small yellow star hair clip, bright sky-blue eyes. Wearing a sporty yellow zip jacket. Bubbly, energetic personality, big cheerful open smile. Head and shoulders, centered, facing the viewer. Plain soft cream-yellow background (#FAEEDA). Clean modern anime cel-shading, soft lighting, high detail, no text, no watermark.

---

## Expression edits

Use these with **Edit image** on each girl's base portrait. Replace `NAME` with the girl's name.

**love** → `NAME_love.png`
> Same character, same hair, outfit, art style and background. Change only the expression: happy and in love, warm gentle smile, light blush on her cheeks, eyes soft and shining. A small pink heart floating near her head.

**angry** → `NAME_angry.png`
> Same character, same hair, outfit, art style and background. Change only the expression: cute angry pout, furrowed eyebrows, one cheek puffed out, arms crossed if visible, a small red anger mark near her head.

**miss** → `NAME_miss.png`
> Same character, same hair, outfit, art style and background. Change only the expression: sad and missing someone, eyebrows tilted up, teary eyes with one small tear, small trembling frown.

**shy** → `NAME_shy.png`
> Same character, same hair, outfit, art style and background. Change only the expression: very shy and embarrassed, deep red blush across her face, eyes looking slightly away, a small nervous smile, one hand near her cheek.

**night** → `NAME_night.png`
> Same character, same hair and art style. Change the expression to sleepy: eyes half closed, a small yawn, relaxed face. Background a slightly darker version of the same color with a few tiny stars.

**call** → `NAME_call.png`
> Same character, same hair, outfit, art style and background. Change only the expression and pose: surprised and excited, eyes wide, mouth slightly open, holding a smartphone near her ear.

---

## App icon → `icon.png`

> Cute chibi anime face of an original adult woman with long soft pastel-pink hair and a small white flower clip (Hana), big sparkly pink-violet eyes, happy blushing smile, a small pink heart beside her. Centered inside a simple soft pink circle on a plain light pink background. Bold, clean, simple shapes that stay readable when very small. No text, no letters, no watermark. Square 1:1.

## Notes

- Don't ask Grok to copy existing anime characters (Hinata, Mikasa, etc.). Original designs keep the app safe on the Play Store.
- Grok's output can be used commercially under xAI's terms, but keep your generated originals as proof they're yours.
