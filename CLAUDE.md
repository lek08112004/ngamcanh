# Aurora Vale (ngamcanh) — handoff notes for Claude

A calm, no-fail camping world in the browser: tulip mornings, aurora nights, free
walking, a flower garden, stargazing, optional peer-to-peer "walk together".
The owner writes in **Vietnamese**; reply in Vietnamese. All UI text is Vietnamese.

## State of things

- **Live site:** https://ngamcanh.pages.dev (Cloudflare Pages project `ngamcanh`, direct upload).
  The live copy can be behind the local repo — check `git log` against what is deployed
  before assuming they match. Deploying is outward-facing: **ask the owner first**, then:
  `npx wrangler pages deploy . --project-name ngamcanh --branch main`
  (needs a one-time `npx wrangler login`, which opens the owner's browser).
- **GitHub:** not pushed. There is no `origin` remote. The owner must create the repo and
  run `git push` themselves (CLI login needs their browser).
- **Privacy rule the owner set:** nothing personal in the repo or the site. Commits use the
  local identity `Aurora Vale <aurora-vale@users.noreply.github.com>` — keep it. Never put
  real names, emails or machine paths in files. This file and `README.md` are served publicly.

## Hard constraints

- 100% static: plain HTML/CSS/ES modules, **no build step, no backend**, deployable as-is.
- No image or audio files: everything is procedural (GLSL + geometry + Web Audio).
  The owner has been told that true photo-realism would need scanned models/textures and
  that this would mean dropping this rule. They have not asked for that yet.
- Only external code: three.js 0.160.0 (minified build via import map from unpkg), and
  PeerJS from esm.sh, loaded **only** when the visitor opts into "Đi cùng bạn".
- Must stay usable on weak machines. Anything new has to fit the quality tiers below.

## What the owner cares about (in their words, roughly)

- It was publicly criticised as "looks like Minecraft apart from the sky". Realism of
  flowers, mountains, cabin, tent and lighting is the priority. Faceted low-poly shapes,
  flat colour and visible noise/grain ("vỡ ảnh") are the things they object to.
- Camping + stargazing is the main experience. The constellation-weaving game is secondary.
- Constellations must come with real background ("lý thuyết"): see `js/lore.js`.
- They want changes implemented, not just proposed — but publishing still needs a yes.

## Layout

```
index.html            page shell, import map, HUD, quick bar, dock, journal, party dialog
css/style.css         glassmorphism UI; body classes: play | view, zen, day, dock-min, idle
js/main.js            renderer, quality tiers, camera/walking, day-night, moods, meteors,
                      campfire, compass/trek log, party UI, post chain, frame loop
js/world.js           terrainH(), terrain, mountain ring, cabin, fence, rocks, grass, camp
js/flora.js           flower geometry builder (Geo), tulips, garden, cherry trees, signposts
js/layout.js          world coordinates (CABIN, CAMP, GARDEN, BOUNDS) — imports nothing
js/game.js            constellation game (firefly, stardust, storms, wishes, save)
js/lore.js            astronomy journal text per constellation
js/net.js             opt-in WebRTC rooms (PeerJS), all inbound data validated
js/audio.js           synthesised wind, fire, pad, chimes, birds, footsteps, stream
js/shaders/*.js       GLSL as JS template strings (see below)
```

Shaders: `common` (noise), `sky` (night + day sky, stars, meteors), `milkyway`, `aurora`,
`terrain` (+ `curvesGLSL` with `terrainH` mirrored from JS), `water`, `grass` (wrap-around
tile that follows the walker), `tulip` (all flowers + blossom/leaf cards), `mountains`,
`light` (static sun shadow map + cloud shadows), `fire`, `post` (final grade, lens blur,
glow sprites).

## Things that will bite you

- **`terrainH` exists twice** — JS in `world.js`, GLSL in `shaders/terrain.js`. Change both.
  Same for `streamX`/`streamW`.
- Shaders are template literals: **no backticks inside GLSL comments**. Avoid GLSL reserved
  words as identifiers (`flat`, `sample`, `input`, `output`, `smooth`…).
- `shared` uniforms in `main.js` are shared *objects*; materials spread `...shared.aurora`
  and `...shared.light`. A new shader that includes `auroraGLSL` or `lightGLSL` must get
  those uniform groups or it will silently read zeros.
- Flowers: geometry attributes are `position`, `normal`, `aInfo` (kind, open), `aUv`.
  Outlines are cut per pixel from `aUv`; `aUv.x == 0` means "no cut-out" (stems, discs).
- The sun never moves, so the shadow map renders **once** (`shadowMap.autoUpdate = false`).
  If you move the sun or add shadow casters later, set `renderer.shadowMap.needsUpdate = true`.
- North is −Z. Yaw is in degrees, positive = turning right. 1 unit = 1 metre.
- Keys: W A S D walk, so sound toggle is `O`, not `S`.
- Browsers cache the modules hard. Tell the owner to press Ctrl+F5 after changes.

## Quality tiers (`main.js`, `TIERS`)

`low` / `medium` / `high`, auto-detected (touch or software GL → low, integrated GPU →
medium), overridable in the dock or with `?q=`. In auto mode `adaptQuality()` sheds, in
order: aurora slices → lens blur → grass density → flower density → resolution.
FPS has **never been measured on real hardware** — only screenshots in headless Chrome.

## Testing

No test suite. Verification so far has been screenshots:

```bash
python -m http.server 8765 --bind 127.0.0.1      # in the repo root
bash tools/shot.sh out.png "auto=zen&time=day&q=high&t=40" 1920,1080
```

Headless Chrome uses software GL, so auto-detect picks `low` — pass `q=high` explicitly.
Its window cannot go narrower than ~500 px, so "phone" shots are cropped, not reflowed.
Screenshots prove it renders; they do not prove input, audio, performance or multiplayer.

Useful URL params: `auto=play|view|zen`, `time=day|night`, `q=low|medium|high`,
`mood=emerald|rose|ice|storm|still`, `spot=hill|fire|lie|tulip|garden|bench`,
`yaw`, `pitch`, `fov`, `t` (aurora time), `sky` (star rotation, degrees), `cons=1`,
`open=journal`, `focus=<constellation id>`, `lens=0`.

## Known weak spots (honest list)

- Mountains: visibly faceted up close, rock texture a bit noisy.
- Near hills are a fairly flat green; grass exists only within ~56 m of the walker.
- Sun shadows were only seen as soft dark patches near logs/rocks; a crisp, clearly
  identifiable cast shadow (e.g. the cabin's) was never captured in a screenshot.
- Cabin/tent are still simple shapes with procedural textures.
- Multiplayer was tested between two headless browsers on one machine only — never
  across two networks, and the avatars were never looked at.
- Astronomy text in `lore.js` is from general knowledge and was not checked against sources.
- Real constellation *shapes* are from RA/Dec, but their placement in the sky is arranged
  to fit the view, not astronomically correct.
