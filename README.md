# moosazafar.com

The deployable site. Everything in this folder is what goes live — plain
static HTML/CSS/JS, no build step.

```
index.html            home — engineering portfolio
engineering/          2 real projects
photography/          standalone page that points at Instagram (see below)
design/               honest "in progress" state
404.html              GitHub Pages serves this automatically on bad URLs
assets/site.css       ALL styling for every page
assets/site.js        ALL behaviour for every page
resume.pdf            generated from Muhammad_Moosa_Zafar_Resume_MEP-2.docx
og.png                1200x630 link-preview card
favicon.svg           browser tab icon
sitemap.xml           lists the 4 pages for search engines
robots.txt            points crawlers at the sitemap
CNAME                 keeps the custom domain bound — see the warning below
images/               your photos go here (currently empty)
```

## Deploying

The site is on **GitHub Pages** under the account `moosazafar99`.

### How it used to be laid out

Four separate repos, each with its own subdomain:

| repo | subdomain |
|---|---|
| `hub` | moosazafar.com |
| `Engineering` | engineering.moosazafar.com |
| `Design` | design.moosazafar.com |
| `Photogrphy` *(sic)* | photography.moosazafar.com |

That is why the old main page 404'd on every section link: it used paths like
`../photography/`, which resolve against moosazafar.com, but the pages lived on
*different hosts*. The photography subdomain additionally had no valid TLS
certificate, so `https://photography.moosazafar.com` threw a browser security
warning.

### How it is laid out now

**One repo — `hub` — serves everything** at moosazafar.com/engineering/,
/design/ and /photography/. One stylesheet, one sitemap, one set of search
signals. Google treats subdomains as separate sites, so consolidating also
stops the portfolio competing with itself.

Upload the **contents** of this `deploy/` folder to the root of the `hub` repo
(not the folder itself, or the site lands at moosazafar.com/deploy/).

The other three repos keep their CNAME and serve a single redirect page each,
from `../redirects/<RepoName>/`, so links already shared to the old subdomains
still land in the right place. Do not put content in them.

### Two things not to drop

1. **`CNAME`** must stay at the repo root, containing exactly `moosazafar.com`.
   Delete it and GitHub unbinds the custom domain. Same applies to the CNAME in
   each redirect repo — that file is what holds the subdomain.
2. **`assets/`** must be uploaded too. Every page loads its CSS and JS from
   there. If you upload only `index.html`, the site loses all styling. (The
   pages are built to stay readable if `site.js` goes missing, but they cannot
   survive a missing stylesheet.)

Changes usually appear within a minute or two. GitHub Pages caches for 10
minutes (`Cache-Control: max-age=600`), so hard-refresh if you see the old page.

## Editing

**Text and content** — edit the HTML directly. The work history lives in
`index.html` under `<section class="exp-section">`; copy an `<article
class="exp-item">` block to add a role. Projects live in
`engineering/index.html` as `<article class="proj">` blocks.

**Anything visual** — edit `assets/site.css` once and all four pages change.
The four pages used to carry four separate copies of the same CSS and JS,
which is why they had drifted apart.

### Before changing colours

The `--muted`, `--a2` and `--accent` variables at the top of `site.css` are all
at or above a 4.5:1 contrast ratio against the background in both light and
dark themes. The previous palette had `--muted` at **1.74:1** on 8px text,
which was effectively unreadable. If you darken these, check the ratio first.

Nothing on the site is set below `0.7rem` (11.2px) for the same reason.

## The photography page

`/photography/` is deliberately **not linked from anywhere on the site** — not
from the main page tiles, not from the main page footer. It is a standalone
landing page whose only job is to send people to Instagram, and the intended
route to it is sharing the URL directly (e.g. from an Instagram bio).

It hosts no gallery on purpose. It is still listed in `sitemap.xml`, though with
no internal links pointing at it, search engines will rank it weakly — that is
the expected trade-off of an unlinked page.

## Still to do

- [ ] **A profile photo.** Save as `images/profile.jpg` (~400×600), then
      uncomment the `<img>` line in `index.html` and delete the `.pf-mono`
      monogram `<div>` above it. Until then the frame shows an "MZ" monogram.
- [ ] **Design & Making projects.** Same pattern as the engineering page.
- [ ] **Re-run `resume.pdf`** whenever the source `.docx` changes — the copy
      here is a snapshot, not a live link.
- [ ] Optionally submit `https://moosazafar.com/sitemap.xml` in Google Search
      Console so the pages get indexed sooner.

## Local preview

```bash
python3 -m http.server 8099
```

Then open `http://localhost:8099`. Use a real server rather than opening the
files directly — the root-relative paths (`/assets/...`) only resolve over
HTTP, not `file://`.
