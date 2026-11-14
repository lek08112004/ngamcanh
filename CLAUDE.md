# Aurora Vale (ngamcanh) — handoff notes for Claude

A calm, no-fail camping world in the browser: tulip mornings, aurora nights, free
walking, a flower garden, stargazing, a day-long thread of small things to do, and
optional peer-to-peer "walk together".
The owner writes in **Vietnamese**; reply in Vietnamese. All UI text is Vietnamese.

## State of things

- **Live site:** https://ngamcanh.pages.dev (Cloudflare Pages project `ngamcanh`, direct upload).
  The live copy is **behind the local repo** (the realism rework, the story thread and the
  dev tools have not been deployed). Check `git log` against what is deployed before
  assuming anything. Deploying is outward-facing: **ask the owner first**, then deploy **a
  clean export of the last commit, never the working folder** (the folder holds `private/`,
  see below, and `wrangler pages deploy .` would upload it whatever `.gitignore` says):
  `rm -rf ../ngamcanh-deploy && mkdir ../ngamcanh-deploy && git archive HEAD | tar -x -C ../ngamcanh-deploy && npx wrangler pages deploy ../ngamcanh-deploy --project-name ngamcanh --branch main`
  (needs a one-time `npx wrangler login`, which opens the owner's browser).
- **`private/`** (git-ignored, on the owner's machine only): the owner's own full books. Now
  `private/money/` = *Tâm Lý Học Về Tiền* (Morgan Housel, bản dịch Hoàng Thị Minh Phúc), full
  text and its 62 pictures, converted from the owner's .mobi. The owner says the author has
  licensed it to them and that the site will get a login so only they can read it; until that
  login exists it must not reach any public copy. `main.js` imports `../private/money/book.js`
  if it is there and adds it to the bench shelf (kind `licensed`, `imgBase` for its pictures);
  without it the shelf has its usual six books. In the text, `[[img:NN]]` is a picture,
  `[[q]]` a quoted passage, `[[sub:…]]` a chapter subtitle (`renderPage`).
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
js/story.js           "Một ngày ở trại" (fifteen pages), the flower book (twelve kinds, with their stories), saved progress
js/seasons.js         the calendar and clock: SEASONS, GROW, BED_PLAN, skyAt/sunAt/partAt, WorldClock (no renderer code)
js/library.js         the six books on the garden bench shelf (classics, a reading-notes book, the valley's own books)
js/cabinroom.js       the room inside the cabin (its own render layer), its lights, and what you can walk through in it
js/corgi.js           Bơ the camp corgi: capsule model, vertex-colour coat, four-beat gait, a small mind of its own
js/movers.js          the per-frame shadow map for things that move (the corgi, companions)
js/store.js           the save: one versioned JSON document in localStorage, schema-cleaned, export/import
js/layout.js          world coordinates (CABIN, CAMP, GARDEN, BOUNDS) — imports nothing
js/game.js            constellation game (firefly, stardust, storms, wishes, save)
js/lore.js            astronomy journal text per constellation
js/net.js             opt-in WebRTC rooms (PeerJS), all inbound data validated
js/audio.js           synthesised wind, fire, pad, chimes, birdsong, footsteps, stream
js/shaders/*.js       GLSL as JS template strings (see below)
tools/shot.sh         screenshot through headless Chrome (virtual time)
tools/drive.mjs       drive headless Chrome over the DevTools protocol (real time, real keys)
tools/check.mjs       audio | walk | story (also the clock and the save) | party | fps — see Testing
tools/audio-probe.html renders every sound layer offline and prints level and spectrum
tools/syntax.mjs      parses every module; fails if anything but store.js touches localStorage
package.json          dev scripts only (npm run serve | syntax | check | fps); the site has no dependencies
```

Shaders: `common` (noise), `sky`, `milkyway`, `aurora`, `terrain` (+ `curvesGLSL`: `terrainH`
mirrored from JS, and the shared meadow helpers), `water`, `grass`, `tulip` (all flowers +
blossom/leaf cards), `mountains`, `light` (static sun shadow map + cloud shadows), `fire`,
`post` (final grade, lens blur, glow sprites).

## Seasons, time of day, and the save

- **Time is one number**: `WorldClock.hour` (0..24) in `seasons.js`. `skyAt(hour)` gives `day`
  and `dusk` from the `SKY_KEYS` table, `sunAt(hour)` gives the sun direction (up in the east,
  over the south, down in the north-west), `partAt(hour)` the named part of the day (Bình minh,
  Buổi sáng, Buổi trưa, Buổi chiều, Hoàng hôn, Ban đêm). By default the clock **runs by itself**
  from the visitor's own time of day: a day and night take `DAY_SECONDS` (16 minutes) and each
  dawn is the next season. The owner asked for this instead of buttons: the dock has one
  slider (`#timeSlider`), a run/stop chip (`#autoDay`, saved as `settings.flow`), and the
  clock chip in the quick bar (`#qTime`, also the N key) runs time forward to the next of
  morning / sunset / night (`PHASES`, `clock.setPhase`). `?time=`, `?hour=` or `?season=` in
  the address pin the clock (it does not run). The star game holds the clock (`clock.hold`).
  `applyDay()` in `main.js` turns the clock into every light, fog and sky value each frame,
  then calls `applySeason()`. `clock.weights` is the season blend (sums to 1).
- **The shade line** (`sunReachAt` in `light.js`, used inside `sunShadow`/`sunShadowSoft`): when
  the sun is low, each place sees it or not past the crest toward the sun. `ridgeFor()` in
  `main.js` walks out from the camp along the sun's bearing over `terrainH + mountainRise` and
  keeps the crest seen highest (`uRidge`: its height and distance; cached per third of a degree);
  the shader compares the sun's elevation with that crest seen from the spot, so the shade
  creeps across the valley from the sun's side instead of switching off everywhere at once.
  `uSunFlat.w` turns it on (medium/high); on `low` the old single factor `uSunReach` is used.
  The three.js sun lamp gets the value at the viewer. The crest is the one seen from the camp:
  far east/west of it the line is an approximation.
- **Sunrise is not sunset**: `uMorn` (in `shared.aurora`, 1 before noon) switches the low-sun
  colours: `DAWN_SUN/AMB/FOG` in `main.js`, the dawn palette in the sky (`daySky`) and in the
  water's reflection; the mountains read their own sunrise visibility map (`uMtnDusk.g`, baked
  for the 6:24 sun) instead of the sunset one (`.r`).
- Shaders see the season as `uniform vec4 uSeason` (declared in `curvesGLSL`, so terrain and
  grass get it together; mountains and the grass fragment declare it themselves) and sunset
  as `uDusk` (declared in `auroraGLSL`, part of the `shared.aurora` group). A material that
  includes `curvesGLSL` **must** be given `uSeason` or its meadow goes black.
- **Several flowers per season** (the owner asked for many kinds, and for the beds not to look
  like ruled stripes): `GROW` in `seasons.js` says how far up each planting is in each season.
  The beds in front of the camp are ribbons that wind (`bedWarp`, mirrored in GLSL in
  `terrain.js`), planted in drifts: `BED_PLAN` + `bedFlowerAt(season, x, z)` give a low edging
  kind in broken runs and taller kinds in patches chosen by damp (`bedWet`: down toward the
  stream) or dry ground (up by the camp). Spring tulip/daffodil/muscari, summer
  lavender/poppy/cosmos, autumn mum/daisy/cosmos, winter heather/snowdrop. `patchTone` gives one
  colour to a drift. Clipped evergreens (leaf cards) and small stones sit among the beds.
  `flowerHere()` in `main.js` uses the same functions, so the flower book agrees with what is planted.
- **The flower walk** (`walkBed`/`walkFlowerAt` in `flora.js`): deep borders both sides of the
  walk from the camp to the rose arch, a crescent in front of the arch and a carpet round each
  cherry tree, planted with a flower for **every** season at every place (plantings `g*` in
  `GROW`). The owner asked for that corner to overflow with flowers all year. Later they found
  the garden itself too bare, so `walkBed` now also covers low kinds under the rose ring and
  every bit of the garden's open ground outside it (not the walks, the lavender block, the
  sunflower field, the arch or the trunks), sown with the same mix (`want = 16000 * scale`, about
  nine plants a square metre on high). The rose ring is planted closer (50/62/75 bushes).
  Cost (780M): garden view high 36.3 → 31.8 fps, bench 34.0 → 31.8, day view high 42.6 → 39.0,
  medium 63.7 → 58.9. A first try with half as much again cost a quarter of the frame rate.
- Off-season plantings are switched off whole (`mesh.visible`, in `applySeason`); that is what
  pays for the extra flowers. `group.userData.meshes[name]` lists each planting's meshes. The garden has sunflowers
  in summer only, and the rose ring is tinted into red camellias in winter (`uTint`).
  Each planting is made by `plant()` in `flora.js` and exposes `{uGrow, uTint}` through
  `group.userData.grow[name]`; names must match the keys of `GROW`.
- The sun moves all day. The shadow map is redrawn when the sun has moved a twentieth of a
  degree or the season is changing (`shadowSettle` in `applyDay`, at most every other frame):
  about eight times a second while time runs, in steps too small to see. It used to be a third
  of a degree twice a second, and the owner saw every shadow judder; on the 780M a redraw does
  not lengthen its frame (measured with `renderer.shadowMap.render` wrapped). The casters'
  depth materials hold the wind still (`uTime` frozen at 0), or a crown or a flower would be
  caught in a different gust at each redraw and its shadow would flicker. The shade-line crest
  (`uRidge`) eases toward each new value instead of jumping. Indoors the stove's shadow is
  redrawn every frame.
  The mountains carry three baked visibility maps (`uMtnMap.a` for the 9:00 sun, `uMtnDusk.r` for
  the 17:36 sun, `uMtnDusk.g` for the 6:24 sun) blended by `uDusk` and `uMorn`.
- **Winter**: snow lies on the tops of built things (`snowy()` in `main.js` adds a few lines to
  every outdoor `MeshStandardMaterial`: white where the surface faces the sky, ragged by noise,
  driven by `uSnowCover` = the winter weight; chained after any `onBeforeCompile` the material
  already had, with its own `customProgramCacheKey`). The stream freezes (ice in the terrain
  shader's water branch: grey-blue, cracks, snow toward the banks, a steady dull sheen; the
  moving water is not even computed in full winter), goes silent, and can be walked on
  (`wetAt` is false in winter).
- **Underfoot from above** (terrain shader, `under`): near you and looking down, the ground is
  painted as an undercoat of short shoots (one per cell, three cell sizes, random angle and
  length), so the eye finds grass between the blades, not bare earth. Every tier (low most
  needs it); only near, downward-looking pixels pay for it.
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
  `createGrass(shared, rng, layers, cabin, roofCount, msaa)`; `shared.uGrassFar` tells the ground
  how far out real blades reach. Each instance is a **card four blade-widths wide**, and the
  fragment shader cuts three slender blades (or two and a seed stalk) out of it per pixel, with
  alpha-to-coverage when there is MSAA (`A2C`) and a hard cut otherwise. Three times the blades
  for the same vertices; frame rate did not move.
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
- **Stems curve** (the owner called the flowers stiff and "straight from the centre"): `Geo.tube`
  has several rings, the vertex shader bends every plant by `bend * y²` (wind + its own lean)
  and tilts whatever grows on the stem by the slope at that height, so a bloom on a leaning stem
  faces the way it leans. `Geo.petal` also sets every petal and leaf slightly off its ideal
  angle and size. New species (`daffodilGeo`, `poppyGeo`, `cosmosGeo`, `mumGeo`, `snowdropGeo`)
  have one model each, no close-up model.
- **Things to do at camp** (all saved through `store.js`):
  the fire burns down in about three minutes and goes out (`fire.level`); feeding it takes wood
  (`fire.wood`, up to 4, filled by walking past the woodpile beside the tent) and being within
  12 m. Flowers met by day go into a satchel (`story.satchel`) and are pressed into the book
  only back at the tent. The cabin porch offers "Vào nhà nghỉ" (E): a fade, a page of text and a
  reading from the book, the clock moves to the next part of the day (overnight = next
  season if the clock runs), and the veil lifts **inside the room** (`enterRoom`): you walk
  about in it (slower, `room.confine` keeps you off the walls and furniture) and "Rời nhà · E"
  by the door (or Esc) fades you back out onto the porch (`leaveCabin` → `leaveRoom`). The garden bench (`GARDEN_BENCH`: back to the cherry trunk, looking
  west through the arch) offers "Ngồi đọc sách" (E): a little shelf of six books (below).
  Everything leaves a line in the camp diary (`story.log`, short ids rendered by `logText`).
- **Sky and ground are tied**: `THREADS` in `lore.js` link each constellation to a flower (same
  season or a shared name); the thread shows once the flower is pressed and the constellation
  picked out or woven. At night the compass and the story card suggest a constellation
  (`starHint`). `LORE[id].deep` opens only when the figure is woven.
- **Star game difficulty** (`weaveRules(stage)` in `game.js`): `game.stage` is saved; guide lines
  go at 2, the gold hint at 4, wrong strokes unravel the weave from 3, a dawn bonus clock from 5,
  hidden stars from 7. `WEAVE_ORDER` runs simplest first. Each woven figure leaves a keepsake
  star above it for good. `?debug=1&stage=N` starts N figures in.
- **The bench shelf** (`js/library.js`, UI in `main.js` around `renderShelf`/`openVolume`/`turnPage`):
  six books, three kinds, and the owner's copyright rules decide what each may contain:
  - `classic` (Walden; Meditations in George Long's 1862 English): authors long dead, public
    domain. Each quotation is **verbatim**, copied from the Project Gutenberg plain text named
    in `src` (Walden #205, Long #15877) and checked word for word when added; chapter or
    book.section in `ref`. The Vietnamese under it is our own free rendering, labelled
    "chuyển ý", never presented as a published translation. Add a quotation only after
    checking it against the source text.
  - `notes` ("Ghi chú bên lửa trại"): books still in copyright (Kahneman, Sagan, Hawking,
    Carson). Only the real title and author, plus a reading note in the voice of a fictional
    guest. **Never** copy, translate or closely summarise such a book.
  - `vale`: the valley's own books, written for the site (Bà Vân's flower book, Ông Khải's sky
    book, the visitor's camp diary). They are built from what has been done (`build(ctx)`), so
    they grow; locked pages say how to unlock them, so no book is ever empty.
  Where each book was left is saved (`read.at` = `['id:page', ...]`, `read.book`); arrow keys
  and A/D turn pages while reading (they do not walk). The paper grain is drawn on a canvas
  once (`paintPaper`); a page turn has a sound (`audio.page()`).
- **The bench corner**: `benchNook()` in `flora.js` plants the four-season walk mix right round
  the bench (seat, feet and a narrow way in kept clear), two-plus clipped box balls (`gShrub`),
  cherry petals lying on the ground and the seat in spring (`gFallen`, an InstancedMesh with a
  canvas-drawn petal), and a lantern on a post (`garden.userData.lantern`: a real
  `PointLight` for the built things, plus `uLampLight` so the ground, grass and flowers get the
  same warm pool; lit from dusk in `applyDay`).
- **The cabin room** (`cabinroom.js`): a log liner (one inward-facing extrusion), plank floor,
  tie beams and rafters, a cast-iron stove with its door open on a shader fire, bed and quilt,
  the table with the notebook, a candle and a mug, a shelf, a rag rug, a rocking chair and the
  dog's cushion. Textures are canvas-drawn (floorboards, quilt, rug, the notebook's pages). Every
  mesh **and light** in it is on `ROOM_LAYER` (1); `enterRoom` switches `camera.layers` to it, so
  outside the room costs nothing and inside nothing of the valley is drawn, not even the sun's
  shadow pass. The windows are a painted view (sky, ridge, meadow coloured from the hour), not
  the real valley. Light: the stove's `PointLight` (the only shadow caster, a cube map redrawn
  every third frame while you are in, its position jittered with the flame so the shadows of
  the chairs and the dog move), a non-shadow bounce light, the candle at night, a spot light
  per window by day, a hemisphere fill. `room.update` runs from `applyDay` only while inside.
- **Bơ, the corgi** (`corgi.js`, wired in `main.js` near `BLOCKS`): capsules and spheres on
  pivots like the companions; coat colours are baked into vertex colours from where each vertex
  sits on the dog (`coat()`), with a `sheen` on medium/high. Gait: each leg has a stance/swing
  cycle; a four-beat walk (LH, LF, RH, RF) blends into a diagonal trot with speed; the body bobs
  twice a stride, the head counters it, the knee bends in the swing. States: idle (looks round,
  sniffs), walk, come (trots over when you arrive within 9 m, or now and then), sit, follow (a
  little way, if you walk off while it sits with you), lie, sleep, happy (petted). Home is between
  the fire and the cabin (radius 7). At night it lies by the fire (or on the porch if the fire is
  out); if you go into the cabin it comes in, asleep on its cushion by night. "Vuốt ve corgi · E"
  within 2 m: hops, wags, a synthesised bark and pant (`audio.bark`), a diary line `c:<season>`.
  On low its pose is worked out at half the frame rate and the coat has no sheen. Test hooks:
  `?room=1` starts inside, `?dog=run` keeps it trotting to and fro; `__av.corgi.walkTo/hold/free`.
- **Shadows of things that move** (`movers.js`): the corgi and companions cast into their own
  small orthographic depth map (22 m, 1024 on high / 768 on medium) around the viewer, redrawn
  every frame with only those meshes; `moverShadow()` in `light.js` multiplies it into
  `sunShadow`/`sunShadowSoft`, so ground, grass and flowers get it. They are **not** in the
  static sun map (it would freeze them where they stood). Built things (bench, rocks) do not
  receive these shadows. None of this exists on `low`.
- **Grass shade** (medium/high): the ground under the sward is shaded from the clump field a
  little way toward the sun, broken into short streaks along the sun's direction (terrain,
  `TERRAIN_Q > 0`), and each blade's lower part is shaded by the clumps sunward of it
  (`GRASS_SELF` in the grass vertex shader). Blades are still not in the shadow map.
- **Crowns and box balls cast**: `cards()` in `flora.js` gives every card mesh a depth material
  (`cardFragment` with `DEPTH_ONLY`, same cut-outs, a fuller cut), so cherry crowns throw dappled
  shade, not only the solid `shades` proxies.
- **Stories**: every flower in `FLOWERS` (`story.js`) has `tales`, shown in the journal once the
  flower has been pressed; every constellation has `tale` (`TALES` at the end of `lore.js`). The owner
  wants these true and gripping. They were written from general knowledge and not checked
  against sources: check before adding to them, and say so if asked.
- **Shadows and shade**: `sunShadowSoft` first looks for a caster (5 taps; in open sun it stops
  there), then filters with eight bilinear lookups over a radius that grows with how far the
  caster is above the point (1.1 to 5 texels): crisp at a stem's foot, soft under a crown.
  Built things use `PCFSoftShadowMap`. Where the sun
  is blocked, the sky light is tinted a little bluer (`shadeSky` in terrain, the same in grass
  and flowers) so shade is not flat grey.
- **Flower surfaces**: `gloss` in the flower fragment varies per pixel (mottle, vein grooves,
  dull thin rim, matte discs, mostly-matte leaves) and sets both the width and strength of the
  sun glint; a weak fresnel sky reflection at grazing angles; light coming through a petal is
  more saturated than light bounced off it and strongest when looking toward the sun.
- **Mountain relief at a slant**: the bump in `mountains.js` comes from screen derivatives of
  a height `h`. On foothills seen edge-on, ridged noise and tree crowns in that height
  stepped like contour terraces and square scales; they now fade with `px` sooner than the
  rest, and the baked map is read with a cubic B-spline (`mapSmooth`, MTN_Q > 0).
- **Flower shadows**: each planting's far mesh has `castShadow` and its own depth material
  (`flowerDepthFragment`, same cut-outs, same `uGrow`), so blooms are in the sun shadow map. Flowers sample it at their own vertices, offset toward the sun. `low` has
  no shadow map and keeps the painted row shade instead.
- **Lens blur** focuses where the view ray meets the ground or the flowers (`focusHit`) and
  stops down for near subjects. It only ever blurs what is nearer than the focus.

## Things that will bite you

- **`terrainH` exists twice** — JS in `world.js`, GLSL in `shaders/terrain.js`. Change both.
  Same for `streamX`/`streamW` and `bedWarp`. `tulipBed()` in GLSL mirrors the beds in `createBeds`.
- GLSL ES 3.00 reserves more words than you think: `patch`, `sample`, `filter`, `input`… (a
  grass variable named `patch` broke the shader once).
- Noise in shaders is faded to its mean before its cells shrink under ~2 pixels (`AA(f)` in
  the ground shader, `wpx` in water, `px` in mountains). Keep doing that for anything new.
- Shaders are template literals: **no backticks inside GLSL comments**. Avoid GLSL reserved
  words as identifiers (`flat`, `sample`, `input`, `output`, `smooth`…).
- `shared` uniforms in `main.js` are shared *objects*; materials spread `...shared.aurora`
  and `...shared.light`. A new shader that includes `auroraGLSL` or `lightGLSL` must get
  those uniform groups or it will silently read zeros.
- Do not multiply a noise coordinate by a direction read from a texture (it was tried for
  mountain gullies): 8-bit normals times world positions in the hundreds gives blocky static.
- Flowers: geometry attributes are `position`, `normal`, `aInfo` (kind, open), `aUv`.
  Outlines are cut per pixel from `aUv`; `aUv.x == 0` means "no cut-out" (stems, discs).
- `shadowMap.autoUpdate` is false; `applyDay` asks for a redraw when the sun or season moves.
  If you add shadow casters later, set `renderer.shadowMap.needsUpdate = true`. Meshes with a
  material array only cast if their first material is standard.
- Anything on a flower that is moved off the stem axis with `g.transform` still bends by its
  model height (`position.y`), which is what you want; but `aInfo.y` (opening) scales about the
  model axis, so keep `open: 0` on transformed heads.
- Anything new that walks about must go in `movers.roots` (not `castShadow` for the sun map).
  Anything new inside the cabin must be on `ROOM_LAYER` or it will not be seen there.
- Grass does **not** cast into the shadow map (flowers do; grass shade is worked out, see above). Outside the map's 104 m square,
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
| high | 52–58 → 46 → 45 → 41.5 → 42.4 fps | 39–41 → 33 → 31.9 fps |
| medium | 87–94 → 71 → 68 → 65 → 64.9 fps | 60–62 → 51 → 50 fps (not re-measured) |
| low | 144 → 144 → 144 → 136 fps | 116 → not re-measured |

(third figure: after the grass cards, the running clock and the five new species; fourth:
after the drift beds, the flower walk, crossed cherry cards, with off-season plantings
switched off. Sitting on the garden bench, high: 34.5 fps. Fifth: the bench shelf and
lantern, caster-aware soft shadows, flower gloss, mountain B-spline map: bench 35.5 fps. Measured on an
AMD Radeon 780M.)

Sixth round (cabin room, corgi, moving shadows, grass shade, crowns casting), same GPU, measured
the same afternoon against the previous commit: day high 43.9 → 43.7, medium 66.0 → 64.1, low
144 → 144 (the display's cap, so it says nothing finer). New baselines: sunny camp with two
companions and the corgi trotting (`hour=10.5&season=summer&ghost=2&dog=run&x=2&z=7&yaw=-15&pitch=-12`)
high 38.1–39.4 (previous commit, same view, no dog: 40.1), medium 55–59 (60.0); inside the cabin
at night with the stove and the dog (`hour=22.5&room=1&x=-9.5&z=-10`) high 79, medium 102, low 144.

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
`hour=0..24`, `mood=emerald|rose|ice|storm|still`, `spot=hill|fire|lie|tulip|garden|bench`,
`x`, `z`, `eye` (stand anywhere, eye height in metres), `yaw`, `pitch`, `fov`,
`t` (aurora time), `sky` (star rotation, degrees), `cons=1`, `open=journal`,
`focus=<constellation id>`, `lens=0`, `ghost=N` (N make-believe companions, no network),
`debug=1` (exposes `window.__av` for the tools).

## Known weak spots (honest list)

- Grass: looking straight down, the gaps between blades now show a painted undercoat of short
  shoots, not bare earth; it is flat paint (it does not move with the wind and has no depth),
  and on `low` the real blades over it are still sparse.
- Winter: snow on built things is a colour by surface angle, not a layer with thickness (no
  overhanging edge, nothing is buried); the corgi, companions, flowers and cherry limbs carry
  none. Ice cracks are a noise pattern and can look like jigsaw lines. Fire and smoke unchanged.
- Sunset: the shade line moves, but fast: on the summer test view it crosses the valley
  between about 16:40 and 17:20 on the clock (about 40 s of real time) and the floor is in
  shade some 40 minutes earlier than before the change (the crest seen from the valley is
  higher than the old ten-degree rule assumed). Not tuned against anything real. Dawn has its
  own colours and mountain light, but was judged from two screenshots only.
- A full unattended day-and-year cycle (64 minutes) has not been watched; the clock was checked
  at single hours, for two seconds of running, and for the jump-to-night button.
- The new flowers were looked at in one screenshot per season. Snowdrops are white on snow and
  hard to see; some cosmos petals shade brown; the tales in the journal were not looked at
  rendered (the code path ran without errors in `check.mjs story`).
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
- Mountain strata now vary by massif (three dips, blended by a slow noise) and fade where a face
  is not bedded; the forest is still grain, not trees, when zoomed right in.
- The pink square blotches on the gravel under the cherries were the painted petal litter (a
  thresholded square-lattice noise), not shadows: it now draws single oval petals per cell.
- The soft blocky patches seen on far green slopes were the mountain bump (ridged relief and
  tree crowns at a slant), not the shadow map; fixed for the foothills that were checked. Rock
  outcrops on the far meadow still have a stepped edge (the far grass tile, per instance).
- Muscari and winter heath (added this round) have one model each; the heath reads a little
  spiky up close. Their tales were written from general knowledge, not checked.
- The bench books: the Walden and Meditations quotations were checked against the Gutenberg
  texts; the Vietnamese renderings are ours and nobody fluent has proofread them. The reading
  notes and the valley books are fiction.
- Rock outcrops in the meadow are flat patches with painted relief, not geometry.
- Cabin and tent are much richer than before but still simple shapes; the signposts, the
  bench and the fence rails are plain boxes.
- Grass shade is an estimate from the clump field, not the blades' real shapes; seen straight
  down it reads as soft streaks. Companion and corgi shadows fall on the ground, grass and
  flowers but not on the bench, rocks or cabin; the corgi casts no shadow on itself outdoors.
  Flower shadows are as sharp as the map allows (4096 on high over 104 m, about 2.5 cm a texel).
- The cabin room: the windows are painted, not a view of the valley; the stove fire is a flat
  shader quad; by night the stove's shadow leaves the back corner very dark. The corgi's gait
  was checked in frame sequences (walk, trot) from the side only; its sit and lie poses are
  approximations (the hind legs fold by rotation, nothing bends like a real hock), and it can
  walk through a companion. Its AI was watched in test runs, not over a long session.
- Sunflower discs are a painted spiral pattern on a low dome, not modelled florets.
- "Dạo vườn" (`STROLL` in `main.js`) follows fixed waypoints; it does not avoid companions.
- `node tools/check.mjs fps` sometimes fails to start when run back to back (port still held);
  run it again.
- Companions are capsule figures. Their movement is interpolated from ten updates a second.
  The corgi is the same kind of model, with more pivots; it is cute at a few metres, plainly
  built from capsules at arm's length.
- Astronomy text in `lore.js` was re-read against general knowledge (two corrections made:
  Rigel's luminosity, Deneb's distance ratio). It was **not** checked against sources.
- Real constellation *shapes* are from RA/Dec, but their placement in the sky is arranged
  to fit the view, not astronomically correct. The story's "recognise a constellation"
  uses those arranged positions.
