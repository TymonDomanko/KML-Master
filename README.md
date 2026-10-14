# KML Master

Five browser tools for map zones in one site: build zones from suburbs and postcodes, number them,
merge them, count the letterboxes in them, and print a map page for each.

**Open it:** https://tymondomanko.github.io/KML-Master/

| Tool | What it does | Was |
|---|---|---|
| [Build](https://tymondomanko.github.io/KML-Master/build/) | Outline suburbs and postcodes as zones and download them as KML. Official boundaries for Australia, the US, Canada and New Zealand, OpenStreetMap elsewhere. | [KML-Zone-Builder](https://github.com/TymonDomanko/KML-Zone-Builder) |
| [Number](https://tymondomanko.github.io/KML-Master/number/) | Renumber the zones in a sensible order (rows, snake, shortest walk, spiral…), fix them by hand, download the renamed KML and an Excel name list. | [KML-Zone-Numberer](https://github.com/TymonDomanko/KML-Zone-Numberer) |
| [Merge](https://tymondomanko.github.io/KML-Master/merge/) | Merge the zones into one outline, with gap closing and hole filling. KML, KMZ or GeoJSON out. | [KML-Zone-Merger](https://github.com/TymonDomanko/KML-Zone-Merger) |
| [Count](https://tymondomanko.github.io/KML-Master/count/) | Count the mailboxes in each zone, from the NSW address register or OpenStreetMap, with houses, apartments and businesses filterable. | [Letterbox-Counter](https://github.com/TymonDomanko/Letterbox-Counter) |
| [Pictures](https://tymondomanko.github.io/KML-Master/pictures/) | One print-ready map page per zone, plus an optional summary page, as a PDF or PNGs. | [KML-Zone-Pictures](https://github.com/TymonDomanko/KML-Zone-Pictures) |

Each tool works as it did in its own repo; the READMEs there still describe every option.

## Working file

Whatever KML or KMZ you open in a tool, or download from one, becomes your **working file** (shown top
right). Switch to another tool and it opens that file straight away, so a typical run is:

1. **Build** the zones and download the KML.
2. **Number** them and download the renamed KML.
3. **Count** the letterboxes in each zone.
4. Print the **Pictures**.

The last eight files are kept in the Working file menu, so you can go back to an earlier one. A tool
doesn't reopen a file it made itself (Merge won't reopen its own merged outline); it reopens the file you
last opened in it. Files are kept in your browser (IndexedDB) and never uploaded.

## How it's built

Everything is static and lives in `site/`:

```
site/
  index.html         home page
  kit/kit.css        shared look: colours, type, controls, layout
  kit/kit.js         shared top bar, theme switch and working file
  build/             Build (app.js, core.js, style.css; boundary data in build/data/)
  number/  merge/  count/  pictures/   one page each
```

Every tool page loads `kit/kit.css` after its own styles and `kit/kit.js` straight after the
`<header class="kit-bar" id="kitBar">`. A tool's KML file input is marked `data-kit-kml`; that is all the
working file needs. Tools map their old colour names onto the shared ones (`--kit-*`), so the look is set
in one place.

The **Build data and deploy** GitHub Action downloads the official boundary files, simplifies them with
[mapshaper](https://github.com/mbloch/mapshaper), writes `site/build/data/` and publishes `site/` to
GitHub Pages. It runs on every push to `main`, or from the Actions tab. If one country's source is down
the rest still deploy. To move to newer ABS boundaries, put the zip URLs in `SAL_URL` / `POA_URL` in
`.github/workflows/deploy.yml`.

### Running it locally

```sh
npm install
npm run build:data   # downloads ~300 MB of boundary files into site/build/data (Build needs this)
npm run serve        # http://localhost:8080
npm test
```

The other tools don't need the data build; any static server pointed at `site/` will do.

## Setup note

In the repo's **Settings → Pages**, *Source* must be set to **GitHub Actions**.

## Licence

MIT
