<p align="center">
  <img src="assets/logo.svg" alt="Reelora" width="320">
</p>

<p align="center"><strong>Stories on repeat.</strong> A streaming-style TV discovery web app built with vanilla JavaScript and the free TVmaze API.</p>

<p align="center">
  <a href="https://insofury.github.io/reelora/"><strong>▶ Live demo</strong></a> ·
  <a href="NOTES.md">Project notes</a>
</p>

---

## What it is

Reelora recreates the experience of a modern streaming service (profile picker, billboard, scrolling rows, details pop-up, video player) as a **portfolio project**. It has its own name, logo and colour scheme and is not affiliated with any streaming company. Show data comes from the open [TVmaze API](https://www.tvmaze.com/api); playback uses the open movie *Big Buck Bunny* as a demo stream.

## Features

- **"Who's watching?" profiles** with add/remove and a **Kids profile** that filters out mature genres
- **Billboard hero** with the show's landscape artwork and title logo (when available)
- **Rows**: Top 10 (big rank numbers), Trending, New on Streaming Today, Critically Acclaimed and 13 genre rows
- **Details pop-up**: synopsis, cast, season picker with episodes, "More Like This" and links
- **Video player** with custom controls, keyboard shortcuts, full screen and **Continue Watching** (resume per profile)
- **My List** per profile, **live search**, **Browse** grid with genre chips and sorting, **New & Popular**
- **Installable PWA** with offline app shell; fully **responsive** (phone → 4K) and **keyboard accessible**

## Tech stack

| Area | Choice |
| --- | --- |
| Language | Modern JavaScript (ES2022 modules), HTML5, CSS3 |
| Framework | None: a small hand-written component/router layer, no build step |
| Data | [TVmaze REST API](https://www.tvmaze.com/api) (no key needed) |
| Routing | Hash router (`#/title/169`) that works on GitHub Pages |
| State | `localStorage` store with change events (profiles, My List, progress) |
| Performance | Request queue, retry with back-off, de-duplication, two-level cache, lazy rows, lazy images |
| Offline | Service worker (network-first shell, stale-while-revalidate API) + web app manifest |
| Hosting | GitHub Pages |

## Project structure

```
reelora/
├── index.html              App shell (nav, main, footer, dialog, overlays)
├── css/styles.css          All styles: tokens → components → responsive
├── js/
│   ├── app.js              Entry point: routes, overlays, global actions
│   ├── core/               No UI: data and plumbing
│   │   ├── api.js          TVmaze client (queue, retry, cache, normalise)
│   │   ├── catalog.js      Library, registry, Kids filter, sorting
│   │   ├── router.js       Hash router
│   │   ├── store.js        Profiles, My List, Continue Watching
│   │   └── utils.js        DOM + formatting helpers, safe escaping
│   ├── components/         Reusable UI pieces
│   │   ├── navbar.js  hero.js  row.js  card.js  modal.js
│   │   ├── player.js  profiles.js  states.js  toast.js
│   │   └── icons.js  brand.js
│   └── pages/              One module per screen
│       ├── home.js  browse.js  new-popular.js  search.js  my-list.js
├── sw.js                   Service worker
├── manifest.webmanifest    PWA manifest
└── assets/                 Logo, favicon, app icons, social preview
```

## Run it locally

No install or build is needed. Serve the folder over HTTP (ES modules don't load from `file://`):

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy

Push to a GitHub repository and enable **Settings → Pages → Deploy from a branch → `main` / root**.

## Credits

- Show data and images: [TVmaze](https://www.tvmaze.com/) (CC BY-SA 4.0)
- Demo video: [Big Buck Bunny](https://peach.blender.org/) © Blender Foundation (CC BY 3.0), via Wikimedia Commons
- Fonts: [Inter](https://rsms.me/inter/) and [Sora](https://fonts.google.com/specimen/Sora) (Google Fonts)

Built by [Ashish Chahar](https://insofury.github.io/). Code released under the MIT License.
