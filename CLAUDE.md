# Aurora Vale (ngamcanh) — handoff notes for Claude

A calm, no-fail camping world in the browser: tulip mornings, aurora nights, free
walking, a flower garden, stargazing, a day-long thread of small things to do, and
optional peer-to-peer "walk together".
The owner writes in **Vietnamese**; reply in Vietnamese. All UI text is Vietnamese.

## State of things

- **Live site:** https://ngamcanh.pages.dev (Cloudflare Pages project `ngamcanh`, direct upload).
  The live copy is **behind the local repo** (the realism rework, the story thread and the
  dev tools have not been deployed). Check `git log` against what is deployed before
  assuming anything. Deploying is outward-facing: **ask the owner first**, then:
  `npx wrangler pages deploy . --project-name ngamcanh --branch main`
  (needs a one-time `npx wrangler login`, which opens the owner's browser).
- **GitHub:** not pushed. There is no `origin` remote. The owner must create the repo and
  run `git push` themselves (CLI login needs their browser).
- **Privacy rule the owner set:** nothing personal in the repo or the site. Commits use the
  local identity `Aurora Vale <aurora-vale@users.noreply.github.com>` — keep it. Never put
  real names, emails or machine paths in files. This file, `README.md` and `tools/` are
  served publicly.

## Hard constraints

- 100% static: plain HTML/CSS/ES modules, **no build step, no backend**, deployable as-is.
- No image or audio files: everything is procedural (GLSL + geometry + Web Audio). Textures
  are drawn on a canvas or baked into a `DataTexture` when the page loads.
  The owner has been told that true photo-realism would need scanned models/textures and
  that this would mean dropping this rule. They have not asked for that.
- Only external code: three.js 0.160.0 (minified build via import map from unpkg), and
  PeerJS from esm.sh, loaded **only** when the visitor opts into "Đi cùng bạn".
- Must stay usable on weak machines. Anything new has to fit the quality tiers below and
  have a fallback on `low`.

## What the owner cares about (in their words, roughly)

- It was publicly criticised as "looks like Minecraft apart from the sky". Realism of
  flowers, mountains, cabin, tent and lighting is the priority. Faceted low-poly shapes,
  flat colour and visible noise/grain ("vỡ ảnh") are the things they object to.
- **Flowers are the sore point.** After the rework they still said the flowers looked fake
  and blurry up close; that led to the goblet tulips, spiral roses and the autofocus lens.
  Expect them to look hard at flowers first. They asked for flowers "like the real ones on
  the web": work from how the real plant is built, and check close-ups, not wide shots.
- Camping + stargazing is the main experience. The constellation-weaving game is secondary.
- They want a story and things to do ("kịch bản", "tính năng"), and a handsome interface.
- Constellations must come with real background ("lý thuyết"): see `js/lore.js`.
- They want changes implemented, not just proposed — but publishing still needs a yes.

## Layout

```
index.html            page shell, import map, HUD, story card, quick bar, dock, journal, party dialog
css/style.css         glassmorphism UI; body classes: play | view, zen, day, dock-min, idle
js/main.js            renderer, quality tiers, camera/walking, day-night, moods, meteors, campfire,
                      compass/trek log, story hooks, companions, autofocus, post chain, frame loop
js/world.js           terrainH(), terrain, mountain ring + baked light map, cabin, fence, boulders,
                      grass layers, camp and tent, canvas-drawn textures
js/flora.js           flower geometry builder (Geo), species (far + close-up models), garden, trees
js/story.js           "Một ngày ở trại" (fifteen pages), the flower book (seven kinds), saved progress
js/seasons.js         the calendar and clock: SEASONS, PHASES, GROW tables, WorldClock (no renderer code)
js/store.js           the save: one versioned JSON document in localStorage, schema-cleaned, export/import
js/layout.js          world coordinates (CABIN, CAMP, GARDEN, BOUNDS) — imports nothing
js/game.js            constellation game (firefly, stardust, storms, wishes, save)
js/lore.js            astronomy journal text per constellation
js/net.js             opt-in WebRTC rooms (PeerJS), all inbound data validated
js/audio.js           synthesised wind, fire, pad, chimes, birdsong, footsteps, stream
js/shaders/*.js       GLSL as JS template strings (see below)
tools/shot.sh         screenshot through headless Chrome (virtual time)
tools/drive.mjs       drive headless Chrome over the DevTools protocol (real time, real keys)
tools/check.mjs       audio | walk | story | party | fps — see Testing
tools/audio-probe.html renders every sound layer offline and prints level and spectrum
tools/syntax.mjs      parses every module; fails if anything but store.js touches localStorage
package.json          dev scripts only (npm run serve | syntax | check | fps); the site has no dependencies
```

Shaders: `common` (noise), `sky`, `milkyway`, `aurora`, `terrain` (+ `curvesGLSL`: `terrainH`
mirrored from JS, and the shared meadow helpers), `water`, `grass`, `tulip` (all flowers +
blossom/leaf cards), `mountains`, `light` (static sun shadow map + cloud shadows), `fire`,
`post` (final grade, lens blur, glow sprites).

## Seasons, time of day, and the save

- `WorldClock` (`seasons.js`) holds the chosen season and phase (`day` | `dusk` | `night`) and
  eases what is shown toward them: `weights` (season blend, sums to 1), `day`, `dusk`.
  `applyDay()` in `main.js` turns those into every light, fog and sky value each frame, then
  calls `applySeason()`. With "Ngày tự trôi" on, phases follow `PHASE_SECONDS` and each new
  morning is the next season.
- Shaders see the season as `uniform vec4 uSeason` (declared in `curvesGLSL`, so terrain and
  grass get it together; mountains and the grass fragment declare it themselves) and sunset
  as `uDusk` (declared in `auroraGLSL`, part of the `shared.aurora` group). A material that
  includes `curvesGLSL` **must** be given `uSeason` or its meadow goes black.
- **One signature flower per season**, and nothing scattered: `GROW` in `seasons.js` says how
  far up each planting is in each season. The stripes in front of the camp are replanted
  (tulips, then lavender, then cúc hoạ mi, then bare under snow); the garden has sunflowers
  in summer only, and the rose ring is tinted into red camellias in winter (`uTint`).
  Each planting is made by `plant()` in `flora.js` and exposes `{uGrow, uTint}` through
  `group.userData.grow[name]`; names must match the keys of `GROW`.
- The sun now moves (morning position, sunset position). The shadow map is redrawn every
  third frame only while the sun or the season is changing (`shadowSettle` in `applyDay`).
  The mountains carry two baked visibility maps, one per sun (`uMtnMap.a`, `uMtnDusk.r`).
- Cherry trees: `growCherry()` builds real forking limbs; blossom cards hang along the twigs
  and slide from blossom to leaf with `uLeaf`; colours per season come from `CROWN` in `main.js`.
- **The save** (`store.js`): `store.get('table.field')` / `store.set(...)`; the schema at the top
  of the file is the single list of what persists. Adding a field means adding it there.
  Old separate keys are migrated once. There is no server database: "no backend" still holds,
  and the owner has been told so. `tools/syntax.mjs` fails if any other module uses
  `localStorage` directly.

## How the picture is put together

- **Mountains** (`createMountains`, `bakeMountainMap`): a ring mesh plus a map baked once at
  load — rg: smooth normal, b: hollows (occlusion), a: sun visibility found by marching
  toward the sun across the height field. The shader never uses vertex normals. Rock detail
  is derivative bump mapping whose octaves fade once they are smaller than a pixel.
- **Meadow**: `meadowColor()`, `rockMask()` and `tulipBed()` live in `curvesGLSL` and are used
  by **both** the ground shader and the grass vertex shader, so blades and ground agree.
  Grass is three nested wrap-around tiles (fine near, main, coarse far) built by
  `createGrass(shared, rng, layers, cabin, roofCount)`; `shared.uGrassFar` tells the ground
  how far out real blades reach.
- **Built things** (cabin, tent, boulders, fence, companions) are `MeshStandardMaterial`, lit
  by three.js lights. `applyDay` matches those lights to the shader uniforms by day
  (three divides by π: `sunLight.intensity = 9.1`, `hemi.intensity = π`). If you change
  `SUN`, `DAY_AMB` or the lights, change both or the cabin and the grass will disagree.
- **Flowers**: tulips, roses and sunflowers have a far model and, on `medium`/`high`, a close-up
  model swapped in within `LOD_NEAR` (7 m). Both share instance buffers; `LOD_NEAR`/`LOD_FAR` defines make
  each vertex shader drop the other's flowers. `aInfo.x` kinds: 0 leaf/stem, 1 tulip petal,
  2 seed disc, 3 rose petal, 4 ray petal (sunflower, daisy), 5 yellow disc. Seed discs carry
  radial UVs and the shader draws the florets as 21 + 34 crossing spirals. Roses are planted
  as bushes (several canes per root). Butterflies are points drawn in `butterflyFragment`.
- **Flower shadows**: each planting's far mesh has `castShadow` and its own depth material
  (`flowerDepthFragment`, same cut-outs, same `uGrow`), so blooms are in the sun shadow map. Flowers sample it at their own vertices, offset toward the sun. `low` has
  no shadow map and keeps the painted row shade instead.
- **Lens blur** focuses where the view ray meets the ground or the flowers (`focusHit`) and
  stops down for near subjects. It only ever blurs what is nearer than the focus.

## Things that will bite you

- **`terrainH` exists twice** — JS in `world.js`, GLSL in `shaders/terrain.js`. Change both.
  Same for `streamX`/`streamW`. `tulipBed()` in GLSL mirrors the stripes in `createTulips`.
- Shaders are template literals: **no backticks inside GLSL comments**. Avoid GLSL reserved
  words as identifiers (`flat`, `sample`, `input`, `output`, `smooth`…).
- `shared` uniforms in `main.js` are shared *objects*; materials spread `...shared.aurora`
  and `...shared.light`. A new shader that includes `auroraGLSL` or `lightGLSL` must get
  those uniform groups or it will silently read zeros.
- Do not multiply a noise coordinate by a direction read from a texture (it was tried for
  mountain gullies): 8-bit normals times world positions in the hundreds gives blocky static.
- Flowers: geometry attributes are `position`, `normal`, `aInfo` (kind, open), `aUv`.
  Outlines are cut per pixel from `aUv`; `aUv.x == 0` means "no cut-out" (stems, discs).
- The sun never moves, so the shadow map renders **once** (`shadowMap.autoUpdate = false`).
  If you move the sun or add shadow casters later, set `renderer.shadowMap.needsUpdate = true`
  — and the mountain map is baked for that sun direction too. Meshes with a material array
  only cast if their first material is standard.
- Grass does **not** cast into the shadow map (flowers do). Outside the map's 104 m square,
  and on `low`, the shade under tulip rows is painted by the ground shader (`rowShade`).
- The lens focus ray assumes planting is 0.55 m tall, 1.95 m in the sunflower field
  (hard-coded rectangle in `main.js`); move the field and you must move that too.
- North is −Z. Yaw is in degrees, positive = turning right. 1 unit = 1 metre.
- Keys: W A S D walk, so sound toggle is `O`, not `S`.
- Browsers cache the modules hard. Tell the owner to press Ctrl+F5 after changes.
- Line endings: the repo is checked out with CRLF conversion; scripts that rewrite files
  with LF are fine, git normalises on commit.

## Quality tiers (`main.js`, `TIERS`)

`low` / `medium` / `high`, auto-detected (touch or software GL → low, integrated GPU →
medium), overridable in the dock or with `?q=`. Per tier: aurora steps, three grass counts,
roof turf, `terrainQ` (bump and near detail off on low), `flowerLod`, tulip and garden
counts, MSAA, lens taps, shadow map size, mountain mesh detail, `mtnMap` (bake size) and
`mtnQ` (rock detail octaves). In auto mode `adaptQuality()` sheds, in order: aurora slices →
lens blur → grass density (all layers) → flower density → resolution.

Measured once, on one integrated laptop GPU at about 1900×980, with `tools/check.mjs fps`
(before the rework → after):

| tier | day | night |
| --- | --- | --- |
| high | 52–58 → 46 fps | 39–41 → not re-measured |
| medium | 87–94 → 71 fps (winter 74, summer sunset 50) | 60–62 → 51 fps |
| low | 144 → 144 fps (winter 144) | 116 → not re-measured |

That is the only hardware ever measured. No phone, no discrete card, no weak desktop.
Night on `high` is the heaviest case and it is the aurora sky, not the land.

## Testing

Serve the repo root, then use whichever tool fits:

```bash
python -m http.server 8765 --bind 127.0.0.1
bash tools/shot.sh out.png "auto=zen&time=day&q=high&t=40" 1920,1080   # a picture
node tools/check.mjs walk      # real key presses: walking, strafing, running, a boulder in the way
node tools/check.mjs story     # the day's thread turns its pages when you do the thing
node tools/check.mjs party     # two browsers meet through the public PeerJS broker (needs internet)
node tools/check.mjs audio     # level and spectrum of every sound layer, rendered offline
node tools/check.mjs fps "auto=view&time=night&q=high"   # frame rate on the graphics card
```

- `shot.sh` uses headless Chrome's virtual time and software GL: auto-detect picks `low`, so
  pass `q=high`. Few frames are drawn before the picture is taken; anything that eases in
  over time must snap during the first frames (see the lens focus) or the shot will lie.
  Its window cannot go narrower than ~500 px, so "phone" shots are cropped, not reflowed.
- `check.mjs` runs in real time. `fps` asks headless Chrome for the real graphics card and
  prints the renderer it got; if that line says SwiftShader, the number means nothing.
- `party` proves two browsers on **one machine** connect. Two different networks (NAT,
  mobile data) have never been tried.
- `audio` measures; nobody has listened to the result. Trust it for clipping and balance,
  not for whether the birds sound like birds.

Useful URL params: `auto=play|view|zen`, `time=day|dusk|night`, `season=spring|summer|autumn|winter`, `q=low|medium|high`,
`mood=emerald|rose|ice|storm|still`, `spot=hill|fire|lie|tulip|garden|bench`,
`x`, `z`, `eye` (stand anywhere, eye height in metres), `yaw`, `pitch`, `fov`,
`t` (aurora time), `sky` (star rotation, degrees), `cons=1`, `open=journal`,
`focus=<constellation id>`, `lens=0`, `ghost=N` (N make-believe companions, no network),
`debug=1` (exposes `window.__av` for the tools).

## Known weak spots (honest list)

- Grass: tufted, arcing blades with seed heads now, but still coarse ribbons; the ground
  shows between tufts, most on `low`. The owner asked twice for better grass.
- Winter is the least finished season: snow is a ground colour, not depth (nothing is
  buried; rocks, tent and bench carry no snow), the stream does not freeze, the fire and
  smoke are unchanged. Summer and autumn mostly recolour; spring got the most attention.
- At sunset the sun sets behind the mountains but the valley floor is still lit by it
  (terrain is not in the mountains' shadow bake). Stars and aurora show through the sunset.
- Cherry blossom reads as near-white with pink hearts; from a few metres the flowers on a
  card are soft. Bare winter twigs are few.
- Camellias are the rose model tinted red, not a camellia model. "Cúc hoạ mi" is the daisy model.
- `main.js` is still one ~1900-line orchestrator. Seasons, story and storage were moved into
  modules; camera, walking, UI wiring and the frame loop were not.

- Flowers: tulips, roses and sunflowers hold up at arm's length, but they are still built
  models with painted shading, not photographs. The owner called them "tạm ổn" but stiff; a
  per-stem lean and sway was added. Using photographed textures was offered and set aside
  by the owner for now (the no-image-files rule stands). Daisies and lavender have no close-up model. Cherry trees are
  clouds of cards and read as such from nearby.
- Far grass tufts look saw-toothed when zoomed in; some blades stand on bare rock.
- Mountain strata are a bit regular; the forest is grain, not trees, when zoomed right in.
- Rock outcrops in the meadow are flat patches with painted relief, not geometry.
- Cabin and tent are much richer than before but still simple shapes; the signposts, the
  bench and the fence rails are plain boxes.
- No shadows from grass or companions. Flower shadows are as sharp as the map allows
  (4096 on high over 104 m, about 2.5 cm a texel): fine for rows, soft for single petals.
- Sunflower discs are a painted spiral pattern on a low dome, not modelled florets.
- "Dạo vườn" (`STROLL` in `main.js`) follows fixed waypoints; it does not avoid companions.
- `node tools/check.mjs fps` sometimes fails to start when run back to back (port still held);
  run it again.
- Companions are capsule figures. Their movement is interpolated from ten updates a second.
- Astronomy text in `lore.js` was re-read against general knowledge (two corrections made:
  Rigel's luminosity, Deneb's distance ratio). It was **not** checked against sources.
- Real constellation *shapes* are from RA/Dec, but their placement in the sky is arranged
  to fit the view, not astronomically correct. The story's "recognise a constellation"
  uses those arranged positions.
