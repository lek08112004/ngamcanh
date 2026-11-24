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
  `rm -rf ../ngamcanh-deploy && mkdir ../ngamcanh-deploy && git archive HEAD | tar -x -C ../ngamcanh-deploy && rm -rf ../ngamcanh-deploy/tools && npx wrangler pages deploy ../ngamcanh-deploy --project-name ngamcanh --branch main`
  (needs a one-time `npx wrangler login`, which opens the owner's browser).
- **`private/`** (git-ignored, on the owner's machine only): the owner's own full books. Now
  `private/money/` = *Tâm Lý Học Về Tiền* (Morgan Housel, bản dịch Hoàng Thị Minh Phúc), full
  text and its 62 pictures, converted from the owner's .mobi. The owner says the author has
  licensed it to them and that the site will get a login so only they can read it; until that
  login exists it must not reach any public copy. `main.js` imports `../private/money/book.js`
  if it is there and adds it to the bench shelf (kind `licensed`, `imgBase` for its pictures);
  without it the shelf has its usual seven books. In the text, `[[img:NN]]` is a picture,
  `[[q]]` a quoted passage, `[[sub:…]]` a chapter subtitle (`renderPage`).
  The owner also asked for two more whole books (Kerry Patterson, Chris Voss; the files are in their
  Downloads folder). They were **not** converted: Claude declined to copy whole commercial books on
  an unverifiable say-so. The shelf's notebook (`notes`) got a reading note for each instead.
- **GitHub:** the owner pushed the repo to GitHub (branch `main`). Do not push more, or deploy,
  without asking. `.github/workflows/keep-alive.yml` pings Supabase every three days (the owner
  set its two secrets; leave it alone).
- **Supabase** (the owner's project, `supabase/schema.sql` already run there): table `saves` (one
  row per anonymous user, RLS: own row only) and `telemetry` (insert-only for `anon`, nobody can
  read it from the site). `js/cloud.js` uses the **publishable** key only, which is meant to ship to
  browsers; never put a secret/service_role key in the repo.
- **Privacy rule the owner set:** nothing personal in the repo or the site. Commits use the
  local identity `Aurora Vale <aurora-vale@users.noreply.github.com>` — keep it. Never put
  real names, emails or machine paths in files. This file and `README.md` are
  served publicly. `tools/` is left out of the deploy (`.gitattributes` export-ignore, and the
  deploy command removes it too); the old live copy still has it until the next deploy. `?debug=1`
  (`window.__av` and every test hook behind it) works only on localhost / 127.0.0.1 / [::1]
  (`main.js` and `cloud.js` drop it elsewhere), so a test from a phone over the LAN has no hooks.

## Hard constraints

- 100% static: plain HTML/CSS/ES modules, **no build step**, deployable as-is. The only server is
  the owner's Supabase project, and the site must work fully without it (offline-first, below).
- No image or audio files: everything is procedural (GLSL + geometry + Web Audio). Textures
  are drawn on a canvas or baked into a `DataTexture` when the page loads.
  The owner has been told that true photo-realism would need scanned models/textures and
  that this would mean dropping this rule. They have not asked for that.
- Only external code: three.js 0.160.0 (minified build via import map from unpkg), PeerJS from
  esm.sh, loaded **only** when the visitor opts into "Đi cùng bạn", and supabase-js 2.45.4 from
  esm.sh (import map), loaded by `cloud.js` only when a sync or a telemetry line is due. The owner
  approved these three and nothing else: ask before adding any library (they named
  InstancedMesh2 as one not to add).
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
js/library.js         the seven books on the garden bench shelf (classics, a reading-notes book, the valley's own books)
js/cabinroom.js       the room inside the cabin (its own render layer), its lights, and what you can walk through in it
js/corgi.js           Bơ the camp corgi: capsule model, vertex-colour coat, four-beat gait, a small mind of its own
js/cat.js             Choco the camp cat's body: one skinned mesh, a tabby coat in vertex colours, fur shells up close, poses, steering
js/catmind.js         Choco's mind: drives, behaviours as generators at a fixed 8 Hz, seeded, what you offer it, bond and memories
js/catprops.js        Choco's shelter, scratching post and water bowl by the cabin; the ball of wool
js/pastimes.js        tea by the fire (stool, tray, kettle, steam, its little state machine) and the decorations you may choose
js/fishdata.js        the 18 fish of the valley + 8 reference pages (data only, sources), the fishing spots, drawFish()
js/fishmodel.js       procedural fish: lofted body per family, ribbed fins, painted coat (canvas), cached per species
js/fishing.js         rod, line, float, ripples; the fishing state machine (aim, cast, wait, hooked, landed, release)
js/fishui.js          the fishing card, the tension meter, the catch card; writes the catch into the save (once)
js/fishbook.js        "Bách thư cá" in the journal: list, filters, search, species pages with a turning model
js/journalnav.js      the journal's tabs (ARIA tabs, keyboard)
js/astro.js           the computed sky: observer, the season's nights, GMST, Sun, Moon, planets (Standish), targets
js/skyinfo.js         what the observing log says about each telescope target, with sources; the Pleiades' nine
js/telescope.js       the telescope on the south hill (3D) and the eyepiece view (Canvas2D), finder, eyepieces, focus
js/orrery.js          "Đài mô phỏng": Sun, planets, Earth (tilted axis), Moon; its own scene, drawn instead of the valley
js/myths.js           two Greek myth lines (Perseus/Andromeda, Orion/Scorpius): chapters, tale vs sky, sources
js/skybook.js         the journal's sky tab (observing log, myth chapters) and the chapter cards in the star game
js/menu.js            the one menu (dialog, six groups, search, settings hosts, icons) and the HUD popovers
js/menucontent.js     what each menu group shows, built from the real state; the search index
js/nametag.js         the "Choco" name card over its head (HTML overlay)
js/snowman.js         Bấc the winter snowman (an original character), his snow bank and the straw bed the animals sleep on
js/movers.js          the per-frame shadow map for things that move (the corgi, companions)
js/store.js           the save: one versioned JSON document in localStorage, schema-cleaned, export/import
js/cloud.js           a copy of the save on Supabase (anonymous user, RLS), and the opt-in telemetry line
js/boot.js            the page's entry: a short look at the cloud copy, then imports main.js
js/layout.js          world coordinates (CABIN, CAMP, GARDEN, BOUNDS) — imports nothing
js/game.js            constellation game (firefly, stardust, storms, wishes, save)
js/lore.js            astronomy journal text per constellation
js/net.js             opt-in WebRTC rooms (PeerJS), all inbound data validated
js/audio.js           synthesised wind, fire, pad, chimes, birdsong, footsteps, stream
js/shaders/*.js       GLSL as JS template strings (see below)
tools/shot.sh         screenshot through headless Chrome (virtual time)
tools/drive.mjs       drive headless Chrome over the DevTools protocol (real time, real keys)
tools/check.mjs       audio | walk | story (also the clock and the save) | cat | party | fps — see Testing
tools/perf.mjs        nine scenes, A/B interleaved, display cap lifted: mean/median/p95/p99, JS and draw time, calls, tris, passes
tools/hitch.mjs       long frames after things done for the first time (cabin door, winter...), and programs built
tools/costs.mjs       what each part of the picture costs: the frame time with one part switched off at a time
tools/audio-probe.html renders every sound layer offline and prints level and spectrum
tools/syntax.mjs      parses every module; fails if anything but store.js touches localStorage
tools/fish-lab.html   every fish model side by side (?only=id,id&yaw=&pitch=&w=&ch=)
supabase/schema.sql   the tables and RLS policies, as run on the owner's project
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
  Old separate keys are migrated once. `tools/syntax.mjs` fails if any other module uses
  `localStorage` directly. `doc.t` is when the progress last changed (not `cloud.*`, not the
  quality tier); `store.onChange`, `syncDoc()` and `adopt()` exist for cloud.js.
- **The cloud copy** (`cloud.js`, offline-first): the first change after the game starts signs
  in anonymously (`signInAnonymously`) and uploads `store.syncDoc()` (no session, no quality tier)
  to `saves`, a few seconds after the *first* change of a burst (walking changes the trek log all
  the time, so a restarting debounce would never fire), with retries backing off to 5 minutes.
  supabase-js keeps its session through a storage adapter into `store` (`cloud.auth`, never
  exported). The newer copy wins by `doc.t`, the edit time inside the save, not by Postgres'
  `updated_at` (an old offline session uploads late). `boot.js` gives a visitor who has synced
  before up to 1.5 s, online only, to take a newer cloud copy **before** main.js reads the save;
  if it arrives later, uploads stop and the dock says "tải lại trang". The dock row "Dữ liệu" shows
  the state in one small line. Honest limit: an anonymous identity lives in the browser, so
  clearing site data loses access to the copy and another device is another user; real
  cross-device sync needs the login the owner plans.
  `?debug=1` (all the test tools) switches the cloud off unless `&cloud=1`; `?cloud=0` always does.
- **Telemetry** (`settings.telemetry`, **off by default**, a switch in the dock): after 60 s of
  measured play, one row: `tier`, `avg_fps` (the windows `adaptQuality()` already measures, after
  two warm-up windows, hidden-tab gaps skipped), `gpu` (WEBGL_debug_renderer_info), `day_night`,
  `season`. Sent through a second supabase client with no session, as `anon` (the only role the
  table lets insert; a signed-in client would be refused by RLS). Once per visit, three tries.

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
  west through the arch) offers "Ngồi đọc sách" (E): a little shelf of seven books (below).
  Everything leaves a line in the camp diary (`story.log`, short ids rendered by `logText`).
- **Sky and ground are tied**: `THREADS` in `lore.js` link each constellation to a flower (same
  season or a shared name); the thread shows once the flower is pressed and the constellation
  picked out or woven. At night the compass and the story card suggest a constellation
  (`starHint`). `LORE[id].deep` opens only when the figure is woven.
- **Star game difficulty** (`weaveRules(stage)` in `game.js`): `game.stage` is saved; guide lines
  go at 2, the gold hint at 4, wrong strokes unravel the weave from 3, a dawn bonus clock from 5,
  hidden stars from 7. `WEAVE_ORDER` runs simplest first. Each woven figure leaves a keepsake
  star above it for good. `?debug=1&stage=N` starts N figures in.
- **The shelf and the page, as drawn** (`renderShelf`, `spineArt`, `renderPage`, `jumpPage` in `main.js`;
  CSS under "the shelf" in `style.css`): two boards, the books in four groups by `kind` with a
  brass plate each (`SHELF_GROUPS`, `SHELF_TIERS`); the shelf scrolls if it outgrows the panel. Each
  spine's cloth and device is painted once on a canvas (`spineArt`: lozenge for classics, stitches and
  a label for the notebook, a picture per valley book, a plain block for `licensed`); the caption
  under the shelf names the book under the pointer; a ribbon marks the one last read. The page:
  running head, centred chapter heading with an ornament (a quiet one on "(tiếp)" pages, class
  `cont`), a drop cap, `licensed` books set like print (first-line indents), the others in spaced
  blocks (`p.gap`); quotations (`#bookQuote`, `[[q]]`) in a tinted panel with a rule in the book's
  colour; a folio and a thin progress line; a contents list (`#bookToc`, books with 4+ headings).
  `--lamp` on `#book` is the bench lantern's level (`benchLamp`, set in `applyDay`, pushed from
  `updateActions`): a warm light on the shelf and the page at night. Keys, `audio.page()`, the save
  (`read.at`, `read.book`) and the ids `check.mjs` reads (`#shelf .spine[data-book]`, `.spine-mark`)
  are unchanged.
- **The bench shelf** (`js/library.js`, UI in `main.js` around `renderShelf`/`openVolume`/`turnPage`):
  seven books, three kinds, and the owner's copyright rules decide what each may contain:
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
    "Sự tích thung lũng Aurora" (`legend`, `taleBook`) is the valley's own legend, told by "the
    fire-keepers": **an original tale**, the owner's rule is that it must not borrow, retell or
    closely echo any real myth (Greek, Vietnamese, Norse...). Nine pages: the mountains that sat
    round the earth's fire (the fjell ring, the bowl), the stream and the winding beds (`bedWet`),
    bà Hạt the seed-seller who planted a kind for every season and the three cherries (the
    `THREADS.uma` line), the aurora as the ground's breath, ông Kim the tailor who stitched the
    frayed figures back with a lavender needle (the `THREADS.lyr` line; a woven figure's keepsake
    star is "the knot"), the cabin, bench lantern and fire ring, the threads, and a last page
    that hands the tale to the visitor's diary. Pages open on: 1 flower pressed, 3 pressed, a
    constellation met, one woven, a cabin rest (`story.done` or an `r:` diary line), one thread
    found; the last when all are open. Keep it consistent with the world if the land changes.
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
- **Bấc, the snowman** (`snowman.js`, wired in `main.js` after the cat): the owner asked for Olaf
  from Frozen; that is someone else's character, so this is **an original one** and must stay so (no
  name, look or lines borrowed from a film). Three lumpy snowballs (vertex colours, a canvas-drawn
  bump map on medium/high), pebble eyes and smile, a carrot, twig arms, a knitted scarf (canvas),
  an upturned terracotta pot of bà Vân's for a hat. Named after the north wind he stands against
  (gió bấc); cheerful, proud of the job, loses count of snowflakes, "goes to work as the stream" in
  spring. He stands behind the fire at (2.2, -6.6) with a low crescent of packed snow and a straw
  bed (`SNOW_REST`), inside the 3.6 m ring round the fire where no bed is planted. `setWinter(w)`
  (from `applySeason`) shows him when the winter weight is over 0.5, grows him as it settles, and
  switches his entries in `BLOCKS` on and off (radius -9 = off; `CAT_BLOCKS` shares the same arrays).
  He does not move: he is in the sun's static shadow map, **not** in `movers.roots` (if he is ever
  animated, move him there). On winter nights `petRest(animal)` hands the dog and the cat his straw
  as `rest` instead of the fire: nothing in `corgi.js`/`cat.js` changed for it. `snowman.entry(x, z)`
  first sends an animal that is behind the bank round the end of it (their walking is straight-line
  and they stuck on the bank before). "Chào Bấc · E" within 2 m: one of six lines, a chime, diary line
  `s:<season>`. There is no weather system: "wind or snow" in the request became "winter weight > 0.6".
  Test hook `__av.snowman`; `check.mjs story` covers summer/winter, the greeting, the block, the bed.
- **Mầm, the little snowman by the garden bench** (`benchSnow` in `main.js`): the owner then asked for one at the reading place too. The same builder at 0.68 size with `bank: false` (no snow bank, no straw), his own name and five lines (he keeps the bench and likes being read to), winter only, in `BLOCKS`, 2.8 m in front of the seat and a little left so the reader sees his face. "Chào Mầm · E" (`snow2`), diary line `n:<season>`. Also original; the request named Olaf again and the answer was the same. He stands among the winter camellias: stems poke round his base. Looked at on high only.
- **Choco, the cat** (`cat.js`, wired in `main.js` next to the corgi): the owner asked for a cat
  with Bơ, "thực tế 100%". Built the most realistic way this project allows (code only, no image
  or model files, no new library): **one `SkinnedMesh`** merged from pieces hung on 34 bones
  (two spine bones, chest and loin, so the back rounds when it sits; 3-joint legs; nine tail
  bones); at each joint the skin is shared half and half between the bones, so it bends as one.
  The coat was repainted after a photo of the owner's real cat: a plump grey-brown mackerel tabby
  (taupe ground `BASE`, brown-black stripes down the flanks, a line along the spine, ringed legs and
  tail, mask lines on crown and cheeks, pale bib, belly, muzzle and feet; amber eyes greenish at
  the rim, pink nose), all in `coat()` as vertex colours. Vertex colours only show a stripe where
  there are vertices, so the trunk's profile is resampled (61 rings) and limbs are lathed capsules
  with rings every 8 mm (`capsule`); the colours are darker than they look in a picker because
  the sun lifts them. Plumper: wider trunk, fuller cheeks, ruff and haunches, legs set wider,
  loaf/sleep 5 mm higher; same 34 bones. on medium/high a faint
  sheen and **fur shells** (6 on high, 3 on medium, 2.7 mm, strands hashed from the rest position)
  shown only within 2.6 m / 1.8 m. Eyes: painted iris, a pupil that is a slit by day and round at
  night (`ctx.light`), an additive cornea and a glint, lids that blink, slow-blink at you, close
  asleep. Nose, mouth line, whiskers (lines, lit by `ctx.light`), ears that twitch on their own and
  flatten when the dog bustles past. Poses: stand, sit (tail round the feet), loaf, sleep, stretch
  (after a nap), groom (licks the right forepaw, wipes its face), and (the Choco round, below)
  crouch (drink, sniff), stalk, pounce, scratch (up on the post), knead, curl (turning round before
  lying down), rub (leaning into you as it walks round you), a yawn (`jaw` bone + `maw` lining), a
  head tilt. It keeps off `CAT_BLOCKS` (BLOCKS plus the two sitting logs, `CAMP_SEATS` from
  world.js, plus its post and bowl). Shell fragments discard NaN (a zero normal once blacked out
  the post chain); a per-vertex `furK` gives each part its fur length (none on the ears, which
  used to grow a spiky fringe). Test hooks: `__av.cat.walkTo/hold/free/place` (hold/walkTo stop
  the mind deciding; it still senses), `?debug=1&eye=0.36` sets the walker's eye height. Honest
  limit: it is a careful procedural model, not a scanned cat; up close the legs read as smooth
  tubes, the fur as a short velvet, and there is no foot IK on slopes.
- **Choco's life** (the owner asked for a cat that is "cực kỳ dễ thương", with its own day,
  character, memory and a natural bond with the player; nothing to tend, nothing to lose):
  - **The mind** is `catmind.js` (`createMind(cat, env)`; `cat.js` is only the body and calls
    `cat.brain`). It thinks at a fixed 8 beats a second with its own seeded random numbers
    (`?debug=1&seed=N` fixes the seed), so behaviour does not depend on the frame rate. Each
    behaviour is a generator (walk there, curl, sleep until...); `mind.lock` marks stretches
    nothing spontaneous may cut (a leap, lying down, a stroke it accepted). Drives (energy, play,
    company, a little thirst, `tol` = how much touch it welcomes now) only weight choices.
    Priority in `urgent()`: unsafe spot (the unfrozen stream) > the dog bustling up (`yield`) >
    accepted interactions > you reading at the bench > a quiet night beside you > night / indoor
    night > far from home > (only after the current behaviour's `min`) your return (greet),
    following you, the wool. Otherwise `choose()` scores the behaviours of `B` (nap, loaf,
    sunbathe, groom, watch, wander, drink, scratch, shelter, dog, come; indoors inBed, inRug,
    inWindow, inWander, perched), damps the two last chosen, and picks by weight; `mind.reason`
    says why (debug only, `__av.catMind.debug()`). A day: wakes with a yawn and a stretch, scratches
    the post, suns itself in the morning and late afternoon (fixed open spots, not computed
    sunlight), naps in its shelter at a summer noon or any winter day, roams in the afternoon,
    looks for Bơ at dusk, sleeps beside Bơ by the fire at night (in winter on Bấc's straw, walking
    each leg round the snow bank; fire out: mostly its own shelter, re-chosen only if the fire has
    stayed changed for 20 s).
  - **Steering** (`cat.js` `steer`/`move`): round any circle across the way (always the same side
    of the same obstacle), a detour when it stops getting closer, `cat.blocked` after two failed
    detours (the mind then cools that behaviour and picks another). `ctx.safe` keeps it out of
    the unfrozen stream (a cat already in the water may step anywhere, to get out). Routes are
    waypoint lists (`cat.follow`): the way to the bench is the gravel walk under the rose arch
    (`benchRoute` in main.js). It does not jump: the rocking chair is reached only by being put
    there under the door's fade.
  - **Its things** (`catprops.js`): a shelter with straw, a rope scratching post and a water bowl
    beside the cabin by the porch (cabin frame x 3.1-3.7, z 4.6-6.0: in the unplanted strip and
    outside the cabin's blocking circle, which once pushed the cat out of its own shelter); the
    bowl turns to ice in deep winter and it does not drink there then. A wicker basket under the
    shelf in the cabin (`room.catBed`; `room.confine(x, z, r, pet)` lets only the cat step in) and a
    spot under the end window (`room.catWindow`; the window is painted, so it looks out at nothing
    real). The ball of wool (`createToy`) is one reused mesh: rolled from your feet toward the cat,
    friction, bounces, a 3.2 m leash, put away 7 s after a game or 45 s untouched.
  - **You and it**: beside it "Choco · E" opens `#catMenu` (1-6: vuốt ve, chìa tay làm quen, gọi,
    chớp mắt chậm, lăn cuộn len, ngồi cùng); 2.4-14 m away, in view and nothing between, "Gọi Choco
    · E". `mind.can(kind)` greys a button with the reason (range, cooldown, asleep, through a wall,
    not in the same place); `mind.offer(kind)` returns the line shown. It may refuse: strokes use
    up `tol`; low, it turns its head and flicks its tail; twice in 40 s, it walks off (`avoid`).
    Asleep it is not woken by strokes or calls. The door: the cat comes in with you only if it was
    within 16 m of the porch (`cat.inside` is its own place; out of your place it is hidden and
    offers nothing); put down asleep it sleeps on (`mind.moved`). The door wins over the cat for E.
    "Ngồi cùng" lowers your eye to about 1 m; any step stands you up.
  - **Bond and memory** (`store`: `cat.bond` 0-100, `cat.marks`, `cat.habits`, `settings.tags`):
    each kind of thing counts less when repeated (halves every 4 min), no more than 6 points per
    10 min, and nothing decays. Levels at 12 and 45 change distance, greeting, following, the slow
    blink and the night beside you; never whether you may stroke it. Seven moments (`MARKS`: hello,
    sun, play, buddy, place, reading, night) are recorded once each with a diary line `q:<id>`;
    habits (`HABITS`) only when you could see it. The journal's "Choco" section is words only.
  - **Name card** (`nametag.js`, `#catTag`): an HTML overlay (sharp text, no draw call, not in a
    photo, hidden in zen / star game / book / journal / when "Tên bạn nhỏ" is off). Anchored above
    the head bone, eased (slower vertically), faded by distance (7-13 m), screen edge and
    occlusion; occlusion is tested 4 times a second against the ground, the cabin walls, the tent
    and the boulders (`catHiddenFromYou`). A second line (`mind.status()`: Đang ngủ, Lim dim, Tò mò,
    Muốn chơi, Đang chơi, Muốn yên) only within 3.2 m or with the menu open.
  - **Sound**: one purr at a time (`audio.purrStop`, also at the door), a greeting trill at most
    every 30 s, a soft `audio.tap` when a pounce hits the wool; only within 9 m and in your place.
    Measured nowhere and listened to by nobody.
  - Tests: `node tools/check.mjs cat` (28 checks: the card shown/hidden near, far, behind you,
    behind the cabin, in zen, switched off; strokes accepted then refused then it walks off; the
    bond cap; the greeting written once; asleep it is not woken; you walking off mid-greeting; the
    wool game; out of the stream; the door both ways and from the garden; the walk to the bench;
    an old save without its fields). A ten-minute unattended run (clock from 6:00 to 19:00, seed 5,
    script only, not watched on screen): 24 changes of mind in the day's order, never standing still
    more than 2 s while meaning to walk, no console error.
  - Cost (780M, 1902x984, high, `tools/perf.mjs`, A = the tree before Choco's round on :8766):
    three full interleaved runs of three rounds each, and four rounds of garden and cabin after the
    basket was taken out of the stove's shadow map. Medians identical in every scene. Means, all
    runs together: Choco up close -1.0 %, Choco by Bơ -1.0 %, winter night -0.4 %, garden +0.7 %
    (last run), cabin +2.2 % (last run). The same code measured against itself moves the mean by up
    to 6 % run to run (frame times land on 6.94 ms steps at 144 Hz), so "within noise, under 5 %"
    is all this shows. Medium and low were not timed (looked at once each).
  - Not done, on purpose: jumping (no landing spots worth the risk; the chair is reached only under
    the door's fade); the window spot looks at a painted window; "sunny" spots are fixed places, not
    computed sunlight; the outdoor props are not in `SHADOW_BOXES` checks beyond one look; the
    sounds were not listened to; nobody has played it on a real phone (a 500 px wide headless
    window only). The kneading, stalking, scratching, drinking, yawning poses and the props were
    looked at in still pictures from two or three sides, the curl and the pounce only through the
    state log, not frame by frame.
  The dog's place by the fire (`DOG_FIRE`) was moved: it used to be inside the west sitting log.
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
- **Flower plots** (`plots()` in flora.js): each planting is cut into 12 m plots (close-up
  models: 5 m), one mesh each with a bounding sphere, `frustumCulled` on, so plots off screen or
  outside the sun's shadow camera are never sent to the GPU, and close-up plots are shown only
  within reach of the viewer (`userData.near`, checked in `applySeason`). Measured first: the
  flowers' cost was nearly all **vertex** work (~10 ms of the garden frame on the 780M, barely
  less at half resolution; ~23 million flower vertices a frame in spring, half of them close-up
  models discarded one vertex at a time beyond 7 m). `THREE.BatchedMesh` (in r160) was tried on
  two plantings in the live scene (gTulip far, gMuscari) with `perObjectFrustumCulled`: it drew
  a fifth of the plants and was no faster than the instanced mesh (31.9 vs 31.9/31.1 fps for
  gMuscari; unculled 29.0), and it needs one copy of the model per plant in memory. Not used.
  Grass and flower vertex shaders use `sunShadowLite` (one tap into the movers' map, not four).
- **Flower shadows**: each planting's far mesh has `castShadow` and its own depth material
  (`flowerDepthFragment`, same cut-outs, same `uGrow`), so blooms are in the sun shadow map. Flowers sample it at their own vertices, offset toward the sun. `low` has
  no shadow map and keeps the painted row shade instead.
- **Lens blur** focuses where the view ray meets the ground or the flowers (`focusHit`) and
  stops down for near subjects. It only ever blurs what is nearer than the focus.

## The world as yours, quiet things to do, and the picture's plumbing (this round)

- **Shader warm-up** (`warmShaders` in `main.js`): three.js builds a program the first time a
  material is drawn. Measured (`tools/hitch.mjs`, 780M, high): the first step into the cabin
  stalled 3.3 s (15 programs), the first step out 0.5 s. 600 ms after the first frame the page
  now builds them in the background with `renderer.compileAsync` (KHR_parallel_shader_compile)
  for both layers, with the same lights, fog and **a render target bound** (the scene is drawn
  into the composer's buffer: no tone mapping, linear output; compiled without one they would be
  built again). The cube-shadow depth programs of the stove light and the movers' depth programs
  cannot be reached that way: one off-screen draw of the room and one forced `movers.render(...,
  force)` build them. That draw is a single 0.2-0.9 s stall about 2 s after load, while the intro
  card is normally on screen (with `?auto=` it shows). After: into the cabin 70 ms, out 0 ms.
  `__av.warm()` says how long it took. Anything new with its own material should be in the scene
  graph at load (visible or not) so the warm-up reaches it.
- **One pass fewer**: tone mapping (ACES, three's own constants) and the sRGB encode are done by
  `FinalShader` itself (`TONE_AND_OUTPUT`), three's `OutputPass` stays in the chain switched off.
  Checked pixel for pixel against the two-pass chain in three scenes: at most 1/255 apart
  (`__av.mergeOutput(false)` restores the old chain). The exposure uniform is copied from
  `renderer.toneMappingExposure` every frame; if you change tone mapping, change `post.js` too.
- **Lens pass skipped when shut**: when the aperture is ~0 (looking at something near) the lens
  pass is taken out of the chain (it cost 1.6-2.2 ms on the 780M just to copy the picture).
  Autofocus no longer hunts: a new focus distance is taken only after it has held 0.3 s (or is
  within ~25 % of the current one), and the focus moves in log distance, at most ~e^1.6 a second.
- **Shadow edges at low sun**: a texel of the sun map lies stretched along the sun by
  1/sin(elevation) on the ground; the narrowest filter radius in `sunShadowSoftMap` now grows with
  it (1.1 texels at noon, up to 3.4 near sunset), and the movers' map uses four bilinear lookups
  (it drew the cat's and dog's shadows as visible 2 cm squares, and long evening shadows as
  staircases). The sun shadow camera's size moves in 4 m steps with hysteresis and its centre
  sits on the texel grid (`fitSize` in `fitSunShadow`), so the texel size stays put for long
  stretches instead of changing whenever an edge crossed a whole metre.
- **The fire by day** is half as bright (`uDay` in the flame shader): at noon the bloom made it a
  pillar of light.
- **Adaptive quality** (`adaptQuality`, `applyShed`, `PRIORITY`): one number `adapt.shed`, steps
  aurora → lens → grass → flowers → resolution (1/8 at a time). Median of three 2 s windows, 6 s
  after any change before the next, steps back up with headroom, and a step up that has to be
  undone within 20 s sets a ceiling for the visit. Not saved. `settings.priority` (Mượt /
  Cân bằng / Đẹp) sets the target (52 / 42 / 26 fps down thresholds) and how deep it may go
  ("Đẹp": aurora and lens only). Only in automatic quality. Hidden-tab time is not counted.
  `watchDensity()` follows a change of devicePixelRatio (moving the window to another screen).
- **Display settings** `settings.priority|lens|bloom|sway` (dock row "Ưu tiên"): per device
  (`DISPLAY` in `store.js`): they do not move `doc.t`, are not taken from the cloud copy or an
  imported file, and survive a full reset. "Máy quay trôi nhẹ" switches off the camera's slow
  decorative drift; it is always off under prefers-reduced-motion.
- **Lost WebGL context**: the page shows `#glLost` and reloads when the context comes back (or on
  the button). three.js cannot rebuild this scene by itself (baked maps, render targets).
- **Indoors** the outdoor sounds (wind, stream, birds) go through one low-pass (`audio.setIndoor`).
- **Tea by the fire** (`pastimes.js`, wired in `main.js` as `pastime`): a stool 2.8 m south of
  the fire between the two sitting logs (the logs point at the fire; they are no seat to face it
  from), a tray with a clay teapot and two cups, a kettle on a flat stone by the ring. "Ngồi pha
  trà · E": you sit (camera set down, `walker.on = false`), the kettle heats only on a lit fire
  (7 s, a rising hiss), pours (2.4 s, `audio.pour`), the cup steams ~90 s and cools. E: another pot
  or get up; any step, Esc, the door, the star game end it. Diary `h:<season>` once a season,
  `me.firsts` 'tea' once. Steam is a pool of 18 sprites, reused. Choco counts it as sitting.
- **Seeing what you are doing it with** (`aimAt`, `followCat`, `CROUCH_EYE` in `main.js`): the cat
  menu opens within 2.4 m, where a cat is far below a level gaze (its head projected at y -1.9, off
  the bottom of the screen; the owner reported it as a bug: "tương tác với Choco mà không thấy").
  Opening the menu, each offer, sitting with it and petting Bơ set `view.yawT/pitchT` toward the
  animal (aimed from the eye height you are going to, a little above the middle so the menu does not
  cover it), with a slower camera follow while `aim.soft` runs; the menu crouches you to 1.3 m; while
  the menu is open or you sit with it the view follows it outside a dead zone. Any drag sets
  `aim.userAt` and the view is left alone for 2.5 s. A drag may start below `LIMIT.pitchMin`
  (it is not snapped back up). `check.mjs cat` projects the head before and after.
- **Sitting and getting up**: `#upBtn` ("Đứng dậy · Esc") shows whenever `seat.on` or a pastime runs
  (not over a book). Esc order: cat menu, then the chair's book, then the pastime, then `seat`, then the
  cabin. `setSeat(on, quiet)` says a line when you stand (quiet for doors and other seats).
- **Tea, finished**: after the pour the button is "Nhấp một ngụm · E" (`pastimes.sip(at, eye)`): your
  cup (a group with its tea, 40-sided) lifts to 42 cm in front of the eye, tips toward you about the
  level line, a quarter goes each sip; four sips empty it (`'empty'` → state `cool`, fill 0), then
  "Pha một ấm nữa". While the kettle heats the button reads "Đang đun nước…" (`wait`). The cup's
  shadow in the static sun map stays on the tray during a sip.
- **The guide** (`#guideSec`, `.howto` in the journal; `.guide` is the compass line, a different
  thing): six collapsible groups (walking, sitting and getting up, Choco, tea, the others, all keys),
  static HTML. `?` opens the journal at it (`openJournal(true, 'guide')`). Keep it in step with keys
  and button labels when they change.
- **The rocking chair** (`room.rock(a)`, `startChair`): sit beside it with E (refused if Choco is
  asleep on it), it rocks about the centre of its runners' arc, creaks at the ends of a swing;
  "Đọc sách bên lò · E" opens the shelf where you sit (`openBook(true, true)`: no walk to the
  bench, no bench diary line; the page is lit by the stove). Esc closes the book first, then
  gets you up. Diary `x:<season>` after 20 s seated, `me.firsts` 'fireside'.
- **The valley as yours** (`me` table; journal section "Thung lũng của bạn"): `me.valley` (32
  chars, `<`/`>` and control characters removed; shown in the tab title and the journal),
  `me.views` up to six 'x,z,yaw,pitch,eye' (key K or the button; outdoors only; going there is a
  short fade, `#hop`), `me.decor` 'slot:variant' for the two fixed places in `DECOR` (porch:
  pennants or red paper lanterns that glow from dusk; tent: a woven rug or two pots of flowers),
  `me.firsts`. "Đặt lại phần riêng" (`store.resetTable('me')`) clears only that table.
  Decorations cast into the sun's map (they are inside `SHADOW_BOXES`), the pots sit inside the
  tent's blocking circle, the stool and the tray are in `BLOCKS` and `CAT_BLOCKS`. They get no
  winter snow (`snowy()` is not applied to them).
- **Measured this round** (780M, 1902x984, `tools/perf.mjs`, display cap lifted, A = the tree at
  the start of this round served from a copy on :8766, B = this tree):

```
scene          copy   mean median    p95    p99  cpu50  js50  js95 draw50 run-sd  calls  Mtris
camp-day       A    28.18  27.90  38.00  45.90  37.00      -      -      -   0.69    789   6.25
               B    28.18  26.90  47.30  62.10  34.90   0.50   1.10  25.20   1.13    849   6.29
camp-night     A    38.94  38.00  58.00  62.50  47.50      -      -      -   0.84    793   7.16
               B    35.07  32.30  62.70  76.10  46.50   0.50   1.00  32.80   1.70    813   7.17
garden-walk    A    33.51  31.30  65.60  92.00  41.00      -      -      -   1.24    182   9.40
               B    32.91  31.00  75.30  92.60  38.70   0.60   1.40  27.70   0.47    188   9.64
cat-near       A    28.48  29.60  49.20  66.50  40.50      -      -      -   1.02    164   3.82
               B    23.93  22.60  45.70  55.10  33.90   0.50   1.10  20.90   0.87    163   3.82
cat+dog        A    26.05  26.50  46.80  58.00  37.50      -      -      -   1.11    103   3.27
               B    20.49  23.00  46.30  52.20  29.60   0.60   1.10  21.90   2.69    102   3.27
winter-day     A    35.52  34.30  51.80  53.20  43.50      -      -      -   0.73    710  12.02
               B    34.68  31.50  47.60  61.90  43.90   0.40   0.70  33.20   1.07    709  12.02
winter-night   A    43.17  42.40  63.40  77.00  52.70      -      -      -   2.03    594  11.30
               B    37.33  37.40  60.00  75.80  46.00   0.40   0.60  37.10   1.09    593  11.30
cabin-day      A    16.92  16.30  34.40  40.80  30.60      -      -      -   1.24    137   0.19
               B    10.00   9.70  13.90  17.00  18.30   0.60   1.00   8.20   0.48    135   0.19
cabin-night    A    16.16  15.80  33.20  35.70  30.30      -      -      -   0.60    162   0.04
               B     9.98   9.70  14.40  24.80  18.30   0.70   1.00   8.10   0.87    160   0.04

medium (same GPU and size, 3 rounds):
scene          copy   mean median    p95    p99  cpu50  js50  js95 draw50 run-sd  calls  Mtris
camp-day       A    19.93  19.00  40.30  44.00  35.50      -      -      -   0.73    825   3.57
               B    19.28  16.50  40.50  45.90  31.60   0.60   1.30  15.60   0.94    806   3.53
camp-night     A    26.29  29.30  47.30  55.00  39.10      -      -      -   0.35    795   4.04
               B    24.55  23.70  46.50  61.60  36.90   0.70   1.50  21.80   0.35    815   4.04
garden-walk    A    23.19  20.20  45.50  60.70  33.80      -      -      -   0.27    179   5.48
               B    20.01  18.00  45.30  69.60  31.20   0.70   1.50  16.10   0.82    180   5.50
cat-near       A    18.27  15.40  40.80  45.60  27.20      -      -      -   0.89    154   2.03
               B    16.13  14.80  38.00  43.60  28.00   0.50   1.10  13.50   0.43    153   2.03
cabin-night    A    12.69  12.20  18.10  22.60  23.30      -      -      -   0.83    162   0.04
               B     9.75   9.60  12.30  13.70  17.90   0.50   0.90   8.20   0.24    160   0.04

(js50/js95: the page's own logic per frame, B only (the diagnostics are new); calls, Mtris: per
frame. Hitches on first use, tools/hitch.mjs, high: into the cabin 3264 -> 69 ms, out 500 -> 0 ms,
to winter 111 -> 63 ms. p95 got worse on high in camp-day (+24 %), garden-walk (+15 %) and
camp-night (+8 %); not explained: B's runs include the start-up warm-up stall in the first
seconds and the 780M's clock moves under load; medium p95 did not get worse.)
```

  The 780M is an integrated GPU sharing a power budget with the CPU: removing work often lowers
  its clock instead of the frame time, so single-part savings measured by `tools/costs.mjs` do not
  add up and small differences (a few %) are within noise. What the removal runs did show (high,
  cumulative): by day grass ~8 ms and flowers ~7 ms of a ~31 ms frame; at night the aurora sky
  ~8 ms; lens + bloom + final grade + the empty post chain ~9 ms; in the garden view the flowers
  ~27 ms of ~31 ms. Thinning far flower plots by 10 % changed nothing measurable, so it was not
  done. Medium is what this GPU gets by default (auto-detect); see the table for it.

## Fishing, the fish book, the myths, the telescope and the model (this round)

- **The menu**: the quick bar is five chips (time, Sổ tay, Khám phá, Đi cùng bạn, Tuỳ chỉnh). "Khám phá"
  (`#explore`, key X) groups what there is to do: Quanh trại (Dạo vườn `#qStroll`, Tự lia máy, Tới bờ
  câu cá, Tới kính thiên văn: these set the compass on the place with `setGuide`, they do not
  teleport), Bầu trời (Hình chòm sao, Trò dệt sao, Chuyện thần thoại, Đài mô phỏng), Ghi lại (Chụp ảnh
  `#qPhoto`, Lưu góc, Sổ tay). The old ids are kept (main.js finds them). The dock ("Tuỳ chỉnh") is
  unchanged. The journal is tabs (`journalnav.js`): Hành trình, Bách thư cá, Bầu trời, Thung lũng của
  bạn, Hướng dẫn, Dữ liệu; `openJournal(true, 'guide' | 'sky' | 'fish:<id>' | <constellation id>)`
  picks the tab; closing returns focus to whatever opened it. Esc closes, in order: Khám phá, the cat
  menu, the journal, fishing, the chair's book, a pastime, a seat, the cabin. The telescope and the
  model take the keys while they are open. Paper-card style (cream #f3ead6, forest #2f4a3a, wood
  brown, lamp gold) for Khám phá, the catch card, the myth page; the journal itself stays dark glass
  with a cream active tab. Not done: the dock was not restyled.
- **Where the fish list comes from**: the University of Oulu's Northern-nature page lists 18 fish of
  Enontekiö (68.4°N, citing Järvinen & Lahti 2004). Those are the valley's 18 catchable species
  (`FISH`); 8 more (`EXTRA`: two North American chars stocked in Lapland, zander, bream, tench,
  crucian, eel, smelt) are reference pages only, each saying why it is not here. Sizes, weights,
  environment, IUCN line: read from each FishBase summary page (Nov 2026). The texts are ours.
  FishBase now files the alpine bullhead as *Alpinocottus poecilopus* (its URL still says Cottus).
  Bite tables, hours, seasons and the size range drawn are **game rules**, shown as "Trong Aurora Vale".
- **Spots** (`SPOTS`, worked out from `streamX/streamW` in fishing.js): riffle z -60, pool z -80, pond
  z -97, standing 1.25 m from the water on the east bank. Casts land only where `isWater` (inside
  streamW - 0.35, z < -36), 1.6 m to `reach`. The float sits at `terrainH` (the water is painted on the
  ground). Winter: the water is frozen and there is no ice fishing (the button says so).
- **The state machine** (`fishing.js`): off → aim → cast → wait (0-3 nibbles, then a bite with a
  strike window: 2.6 s relaxed / 1.5 s manual) → hooked (runs and rests; tension; relaxed eases the
  reel during runs and caps tension at 0.86; manual loses the fish past 1.0 for 1.1 s or slack 6 s) →
  landed (held in front of the camera, closer the smaller) → release (back to the water, swims off,
  removed) → aim. `leave()` from any state: the line comes in, then off. Walking off calls `end()` at
  once. The fish is drawn (`drawFish`) at the bite and **written only on 'landed'** (fishui.js
  `record`): `fish.seen`, `fish.first` ('id|spot|season|part|cm', once), `fish.best`, `fish.count`,
  diary `a:<id>` once. Reeling is holding E or the button (`reel(true/false)`), never tapping.
- **Fish models** (`fishmodel.js`): ten body families with their own profiles and fin layouts, eyes,
  barbels, stickleback spines; the coat is a 512x256 canvas per species wrapped by uv (u along the
  body, v round it). Pattern names in `look.pat`. Cached per species (geometry + textures). Not
  animated except as a whole (no body wave). Look at them in `tools/fish-lab.html`.
- **The fish book** (`fishbook.js`): thumbnails and the species model are drawn by the game's own
  renderer into one offscreen render target and read back (`readRenderTargetPixels`) into canvases;
  no second WebGL context. The species model redraws at most ~30 times a second, only while shown,
  and stops when the tab or page changes. Unseen valley fish are a sepia sketch (CSS filter); all
  text is open from the start.
- **The computed sky** (`astro.js`): the valley's own sky stays scenery (random stars, arranged
  constellations). The telescope, the observing log and the model use: observer 68.4°N 23.6°E;
  one night per season (`SKY_NIGHTS`: 20/3/2026, 24/8/2026, 25/10/2026, 16/1/2027) at the valley
  clock's hour as local civil time; GMST (IAU 1982), Almanac low-precision Sun and Moon, Standish
  planets, Meeus for Jupiter's moons (x only) and Saturn's ring tilt; J2000 positions, no precession.
  Checked: full/new Moon 3 and 18 Jan 2026, Jupiter at opposition 10 Jan 2026, Saturn edge-on
  23 Mar 2025, Antares never rising at 68.4°N (`check.mjs acts`). The summer night is twilight.
- **The telescope** (`telescope.js`, `SCOPE` at (-2, 104) on the south hill): a 90 mm f/10 refractor
  on an alt-az mount, 6×30 finder (7°), eyepieces 25/10/6 mm (36/90/150×). Full-screen Canvas2D view
  (`.scope`); while it is open main.js does **not** draw the valley (`composer.render` skipped) and the
  clock is held. Field stars: real constellation stars and the Pleiades' nine, plus faint stars from a
  hash per 0.5° patch (illustration). Moon: maria and named craters by selenographic position, lit by
  the phase angle and the Sun's direction in the field, cached per phase/orientation; planets sized by
  distance, softened by 2″ seeing; doubles at their real separations; nebulae as grey smudges, colour
  only with "Minh hoạ tăng cường" (labelled). Image upright, not mirrored. Assist mode slews and
  focuses; manual keeps a focus offset per eyepiece (Q/E, wheel, buttons). An observation is recorded
  (`sky.obs`, `sky.first`, diary `o:<id>`, once) after 2 s centred, sharp, above 2°, dark enough
  (Sun < -6°, or < -0.8° for Moon/planets). There is no way to point at the Sun.
- **The myth chapters** (`myths.js`, game.js `startMyth/endMyth`, `MYTH_CONS`): Cepheus, Andromeda,
  Perseus, Cetus are in `MYTH_CONS`, **not** in `CONSTELLATIONS` (labels, journal stories, keepsakes
  and `WEAVE_ORDER` unchanged). A chapter lays its line out on one tangent plane (real relative
  positions), scaled by the figure being woven and its neighbours within 40°. Relaxed: guides, gold
  hint, no slips, no dawn clock; challenge: `weaveRules(stage)`. A chapter never moves `game.stage`;
  `woven` gets the id. Done: `sky.myth` 'line:n' once, diary `y:<line><n>`, a card with the drawn
  figure, Chuyện kể and Bầu trời thật. Leaving play mode ends the chapter. Tales and their variants
  name their classical sources (theoi.com translations); sky facts name Wikipedia pages.
- **The model** (`orrery.js`): own scene and camera, drawn with the game's renderer instead of the
  valley while open; its own date (starts at the season's night, runs 1 day/s by default, ±1 year/s),
  the WorldClock is held; the camera's view is saved on open and restored on close. "Dễ quan sát"
  (sizes enlarged, distances compressed, both said) and "Tỷ lệ thực" (1 AU = 100 units, labels mark
  invisible planets). The Earth's axis is fixed toward the celestial pole; the info line gives the
  subsolar latitude and whether the Sun sets at 68.4°N. The Earth's surface is an illustration, said so.
- **Save** (`store.js`): `fish` {seen, first, best, count, mode} and `sky` {obs, first, myth, scope,
  weave}. Old saves load with them empty (checked).
- **Debug**: `__av.fishing`, `fishUI`, `startFishing`, `stopFishing`, `scope`, `orrery()`,
  `openOrrery`, `startMythChapter`; `?debug=1&acts=0` hides the telescope model and the tackle (to
  measure their cost when idle); `tools/perf.mjs` takes `XA=` / `XB=` extra address parameters.

## The menu, and the polish round (latest)

- **One menu** (`menu.js` + `menucontent.js`, wired at "the menu" in main.js): a dialog on the right
  (a near-full sheet under 720 px) with groups Tổng quan, Quanh trại, Câu cá, Bầu trời, Sổ tay,
  Tuỳ chỉnh (sub-groups Thế giới, Hình ảnh, Âm thanh, Điều khiển, Hỗ trợ, Dữ liệu), a search over
  `items()` (names, groups, keywords, accents optional; never the books' text), and a footer (Chụp
  ảnh, Đi cùng bạn, where the progress is saved). The quick bar is five `.q-btn`: `#qTime` (opens the
  "Giờ & mùa" popover; N still steps the time), `#qJournal`, `#qExplore` (X), `#qFriends`, `#qMore`
  (B, opens Tuỳ chỉnh). `#soundBtn` opens the volume popover (O still mutes). The seg (Ngắm sao /
  Trò dệt sao) only shows in play mode. The old `#dock` stays in the HTML as the place its rows wait:
  `createMenu` **moves** them (same elements, ids, listeners) into the settings groups; the two
  popovers move the time/season rows and the volume row into themselves while open. Content groups
  are rebuilt when shown and dropped when left (no per-frame work, nothing while closed). While the
  menu is open: `body.menu-open` hides the in-scene prompts, the keydown handler swallows keys except
  Esc/X/B, `updateWalk` ignores input, the scrim takes pointer input. Esc closes the top layer first;
  focus returns to the opener; Tab is kept inside. `settings.uiScale` (1 / 1.12 / 1.25, display
  setting) zooms the panels (`--ui-zoom`), never the 3D canvas.
- **Polish round**: fish bend as they swim (`fishmodel.js` `SWIM`, a travelling wave in the vertex
  shader per family; held fish wriggle then calm; book preview can pause; reduced motion holds them
  still); the reel button keeps its hold when the finger slides off (pointer capture); a new fight
  starts at the float (lateral reset); telescope exit returns focus, no arrow into the ground; myth
  chapters keep a half-woven figure for the visit (`mythKept`), "đã dệt" vs "đã đọc" (`sky.read`),
  "Tiếp tục" per line, two tabs (Chuyện kể / Bầu trời thật) on the chapter card, silhouettes per
  chapter (`drawEmblem`); the orrery declutters labels, pinch-zooms, marks the followed body; the
  fish book has a reset view, a clear-filters empty state, keeps its scroll, says the IUCN scope.
  The star game's first draw was 31-41 ms (ANGLE finishing programs on first use): the warm-up now
  shows the empty game group for 300 ms. Measured with vsync off, "73 ms hitches" were mostly frame
  queueing, not stalls; with vsync on the first play entry still drops 1-3 frames (35-63 ms), not
  explained (not shaders, shadows, CSS or the camera move). Network tests (blocked Supabase, offline
  mid-catch, storage refused, CDN down) pass: progress is local first, no false "synced".

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
  The sun's shadow camera is **fitted** at each redraw (`fitSunShadow` in main.js) round
  `SHADOW_BOXES` (cabin + camp + the beds next to them; the garden and its walk; up to the cherry
  crowns), seen from the sun: sides from ~26 m (early sun) to ~100 m (noon, the cabin-to-garden
  diagonal across the view), against the old fixed 104 m square, i.e. 1.6x to 6.7x the texels per
  square metre. Near/far stay 60/400 (light.js assumes a 340 m depth range); `normalBias`
  scales with the texel. Anything new that should cast must be inside those boxes. A tighter
  map was not possible without losing the cabin or the far side of the garden. The PCF tap count
  was not raised: the frame is fill-bound (half resolution doubles it), so there was no budget.
  If you add shadow casters later, set `renderer.shadowMap.needsUpdate = true`. Meshes with a
  material array only cast if their first material is standard.
- Anything on a flower that is moved off the stem axis with `g.transform` still bends by its
  model height (`position.y`), which is what you want; but `aInfo.y` (opening) scales about the
  model axis, so keep `open: 0` on transformed heads.
- Anything new that walks about must go in `movers.roots` (not `castShadow` for the sun map).
  Anything new inside the cabin must be on `ROOM_LAYER` or it will not be seen there.
- Grass does **not** cast into the shadow map (flowers do; grass shade is worked out, see above). Outside the fitted map (`SHADOW_BOXES`),
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
lens blur → grass density (all layers) → flower density → resolution, and gives them back (see
"The world as yours ... (this round)" for the windows, cooldown, ceiling and priority).

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

Eighth round (flower plots, fitted sun shadow, one-tap mover shade in vertex shaders), measured
interleaved in one session, two rounds, against the commit before the garden was filled (old)
and the commit with the filled garden (head): garden walk high old 33.3 / head 28.6 / now 35.4;
garden medium 53.1 / 44.5 / 52.8; bench high 31.7 / 29.2 / 31.5; day high 37.8 / 37.3 / 46.1;
day medium 55.8 / 54.2 / 64.1; garden low 141.9 / 135.3 / 137.2. Run to run these move by 1 to 2
fps (the first build loaded in a round tends to score higher), so garden medium and the bench are
level with the sparser garden, not better. Earlier figures in this file came from other days and
are not comparable to these.

That is the only hardware ever measured. No phone, no discrete card, no weak desktop.
Night on `high` is the heaviest case and it is the aurora sky, not the land.

## Testing

Serve the repo root, then use whichever tool fits:

```bash
python -m http.server 8765 --bind 127.0.0.1
bash tools/shot.sh out.png "auto=zen&time=day&q=high&t=40" 1920,1080   # a picture
node tools/check.mjs walk      # real key presses: walking, strafing, running, a boulder in the way
node tools/check.mjs story     # the day's thread turns its pages when you do the thing
node tools/check.mjs cat       # Choco: name card, what it does with what you offer, limits, the save, the door
node tools/check.mjs world     # the save's new parts, tea, rocking chair, decorations, views, quality ladder, warm-up, lost context
node tools/check.mjs acts      # fish data and the bite table, astro against known events, fishing states, the book, telescope, model, myths, the save
node tools/check.mjs menu      # every old control inside the menu and working, no input to the world, focus, Tab, search, guiding, no growth
node tools/perf.mjs 3          # frame time, A (a copy of the old tree served on :8766) vs B (:8765); PROBE=1, Q=, ONLY=
node tools/hitch.mjs           # stalls on first use (shader programs built on the spot)
node tools/costs.mjs           # the frame with one part off at a time (lens, bloom, grass, flowers, sky...)
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

- This round's activities: fish are procedural models with painted coats, not scans; they do not bend
  as they swim (the whole fish turns). The water is painted on the ground, so the float and the
  released fish sit on a flat surface with no refraction. No ice fishing in winter. The fishing
  sounds were not listened to. The bite tables are game rules, not biology. The telescope's faint
  field stars, cluster members, nebula shapes and small lunar craters are illustrations (said in the
  UI); the summer night is only twilight at 68.4°N; the horizon in the eyepiece is flat at 2° (the
  mountains are ignored). The myth figure card's emblems are simple line drawings. The model's Earth
  has no real continents (said so). The menu was redesigned for Khám phá, the journal tabs and the
  activity cards; the dock and the top-right controls were not. Phone layouts were checked at 400 px
  in headless Chrome only (no real phone). Fish species texts, myth retellings and sky facts were
  written from the sources named in them; nobody fluent has proofread the Vietnamese.

- Grass: looking straight down, the gaps between blades now show a painted undercoat of short
  shoots, not bare earth; it is flat paint (it does not move with the wind and has no depth),
  and on `low` the real blades over it are still sparse.
- Frame rate, snowman and the plumper cat (780M, one interleaved run, previous commit / this one): high, winter night by the snowman 30.6 / 30.4, winter day 35.8 / 37.7, cat at 1 m 44.7 / 43.8; low 118.3 / 115.8, 128.4 / 127.6, 142.6 / 141.4. All within the 1 to 2 fps these runs move by. The medium figures of that run are **not usable**: partway through, old and new alike fell to about 26 fps (something else was using the graphics card). Medium still needs measuring.
- Bấc: he stands quite still (no blink, no wave); by firelight his snow goes orange-pink, which is
  the fire's light but reads oddly; the straw bed is a flat textured disc with a faceted edge; the
  snow bank is four mounds, not a drift. On `low` his snow has no bump map. His lines are six and
  come round again. The animals' way in round the bank is one waypoint, watched in test runs only.
- Choco's stripes are as fine as the mesh allows: soft-edged up close, and the mask on the face is
  a few lines, not a real tabby's. The plumper trunk was checked in sit, loaf, sleep and stand at
  all three tiers from two sides; the stretch and groom poses were not looked at again.
- The redesigned shelf and page were looked at in desktop Chrome at 1280x800, by day and by night;
  the narrow (phone) layout was changed blind. The contents list is the browser's own select.
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
  Flower shadows are as sharp as the map allows (4096 on high, 0.6 to 2.5 cm a texel by the hour).
- The cabin room: the windows are painted, not a view of the valley; the stove fire is a flat
  shader quad; by night the corner behind the stove is lifted by a weak warm fill light
  (`stoveFill`, no shadow), measured a little brighter, not tuned against anything real. The corgi's gait
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
