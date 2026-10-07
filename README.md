# Sikh Literature

English translations of Sikh historical texts, published at
<https://dhariwald.github.io/sikhliterature/>.

The site rebuilds itself every time you commit. Give it about a minute.

## Posting a reading

Every reading already has a page. An unposted one says "not yet posted" and tells you the
exact path to create. For example, to post Suraj Prakash Ras 3, Ansu 44:

1. Go to **Add file → Create new file**.
2. Type the path as the filename: `web/docs/suraj-prakash/ras-3/ansu-44.md`
   (typing `/` creates the folders as you go).
3. Paste the markdown. **Commit changes.**

The generated placeholder is replaced by your file automatically. Nothing else to update:
the reading appears in the index, the sidebar and the search.

To correct a reading already posted, open its file, click the pencil, edit, commit.

## Adding an audio reading

Put the recording under `web/docs/audio/`, at the same path as the reading, with the same
name. For Suraj Prakash Ras 3, Ansu 44 (`web/docs/suraj-prakash/ras-3/ansu-44.md`):

    web/docs/audio/suraj-prakash/ras-3/ansu-44.m4a

1. Open (or create) that folder on GitHub: **Add file → Upload files**. To create it,
   start with **Create new file**, type `web/docs/audio/suraj-prakash/ras-3/x`, commit,
   then upload into that folder and delete `x`.
2. Rename the recording to match the reading (`ansu-44.m4a`, `episode-07.m4a`,
   `sakhi-12.m4a` — two-digit numbers) and drag it in. **Commit changes.**

That reading page then gets a player bar pinned to the bottom of the screen (play/pause,
back and forward 5 seconds, seek bar, volume) and remembers where each listener stopped.
The index lists the reading with *audio* beside it. Readings without a file show no bar.

`.m4a` and `.mp3` play everywhere; `.aac`, `.ogg`, `.opus`, `.wav`, `.flac` and `.webm`
are also picked up. To replace a recording, upload a new file with the same name.

**Keep the files small.** GitHub's web upload stops at 25 MB per file and a GitHub Pages
site must stay under 1 GB in total. Spoken word sounds fine as mono AAC at 48–64 kbps,
about 0.4 MB a minute (a 20-minute ansu is ~8 MB). A phone voice memo is usually already
close to that; if not, `ffmpeg -i in.m4a -ac 1 -b:a 56k ansu-44.m4a` shrinks it.

If the audio ever needs to live elsewhere (for size), put its full URL at the very top
of the reading's `.md` file instead:

    ---
    audio: https://example.com/ansu-44.m4a
    ---

## Verse layout and slideshow

The **Aa** panel's *Verse layout* shows each verse either as **Split view** (all the
Gurmukhi lines, then all the English) or **Line by line** (a Gurmukhi line, its English,
the next Gurmukhi line...). In *Slideshow mode*, line by line can show **1 verse per slide**
or **1 line per slide**.

A reading can be written either way and both layouts still work:

    ਪੰਜ ਭੁਜੰਗੀ ਲਏ ਉਠਾਇ ॥ ਚਾਰੈ ਬਰਨ ਇਕ ਕੀਏ ਭਰਾਇ ॥\        <- split, as now
    ...

    ਪੰਜ ਭੁਜੰਗੀ ਲਏ ਉਠਾਇ ॥\                                 <- line by line, one paragraph
    He raised up the five bhujaṅgīs\
    ਚਾਰੈ ਬਰਨ ਇਕ ਕੀਏ ਭਰਾਇ ॥\
    and made the four varnas one, as brothers.

(Line by line also works with each line as its own paragraph, a blank line between them.)
End each verse with its number, `॥੩॥` and/or `(3)`. Lines are matched one Gurmukhi line to
one English line; a Gurmukhi line holding two padas is halved at its middle `॥` or `।` when
that makes the counts match. A verse whose line counts can't be matched simply shows as
written in both layouts.

## Adding a Gurmukhi font

Readers pick the Gurmukhi typeface in the **Aa** panel (Latin text keeps its own
typeface). Five Google fonts are built in. To add another, unzip it and upload the font file(s) to
`web/docs/assets/fonts/` (**Add file → Upload files**). `.woff2`, `.woff`, `.ttf` and
`.otf` all work. The name in the menu comes from the file name
(`RiyastiNaveen-Regular.ttf` → *Riyasti Naveen*); a file with *Bold* in its name becomes
that font's bold. Nothing else to edit.

The font must be a **Unicode** Gurmukhi font. An older ASCII-mapped font (the GurbaniAkhar
kind) shows the site's Unicode text as Latin gibberish.

The **Show Gurmukhi** switch in the same panel hides every Gurmukhi verse, line and word
and leaves the English.

## Adding chapters, volumes or whole texts

Everything the site knows about is in **`web/contents.yml`**. Nothing else lists readings.

- **A text runs longer than listed** — raise that division's `to`.
- **A new division** (another Ras, volume or chapter) — add a line under `divisions`.
- **A new text entirely** — copy the shape of one of the three already there.

Commit the change and the pages, indexes and navigation all follow.

## How it works

`web/hooks/build_pages.py` reads `contents.yml` at build time and generates a page for
every reading, every division index and every text index. Where a real `.md` file exists
it is used as written; where one doesn't, a "not yet posted" page stands in its place.
That is why the repository holds a handful of files but the site has hundreds of pages.

## Formatting notes

Two things in these translations break most markdown renderers. Both are configured in
`web/mkdocs.yml`:

- **`---` separators around a colophon** parse as a YAML block or a table in some tools.
  Fine here.
- **Backslash line breaks** in the Sri Mukhvaak blocks. Standard Python-Markdown drops
  them and runs Gurmukhi, transliteration and English together on one line.
  `pymdownx.escapeall` with `hardbreak: true` keeps them apart.

The audio player is `web/docs/assets/audio.js`; the build hook finds the file and adds it
to the page.

Footnotes open as a popup where the reader is, rather than sending them to the bottom of
the page. That is `web/docs/assets/footnotes.js` — no external library, works offline.
Typography and colours are in `web/docs/assets/reading.css` and the `palette` block of
`web/mkdocs.yml`.
