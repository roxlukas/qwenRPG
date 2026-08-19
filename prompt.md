# The prompt

This is the specification prompt as it was actually given to `qwen3.8:27b` through Qwen Code,
preserved unedited. Its known flaws are documented in the README and deliberately left in
place - they are part of the record.

The prompt is written in English for better instruction following; the in-game strings it
asks for are Polish.

## Model settings as used

```
temperature      0.25
top_p            0.9
repeat_penalty   1.05
num_ctx          32768
```

Thinking mode was left **on**. Planning before coding measurably improved feature
completeness.

Note in hindsight: `temperature 0.25` is the wrong call here. With thinking mode enabled,
pushing toward greedy decoding invites repetition loops, and the model's own defaults
(1.0 / top_p 0.95 / top_k 20) are tuned for it. Left unchanged above for accuracy.

---

You are a senior JavaScript game developer. Build a complete, single-file HTML5 game.

# CONSTRAINTS — READ FIRST

1. Deliver the game as a single file, `game.html`, complete from `<!DOCTYPE html>` to
   `</html>`.
2. Zero external dependencies: no CDN, no `import`, no libraries, no image/audio/font files.
   Every pixel is drawn from code.
3. Zero placeholders: no `TODO`, no stubbed functions, no feature left for "later".
4. All logic inside one `<script>` tag. Vanilla JS only, no frameworks, no ES modules.

# THE GAME

Top-down, tile-based, **turn-based** pixel-art roguelike. Mouse-driven. Cold night palette.

## 1. Rendering

- `TILE = 12` source pixels, `SCALE = 4` → 48 px per tile on screen.
- Canvas `960 × 624` (20 × 13 visible tiles), `ctx.imageSmoothingEnabled = false`.
- Camera centred on the player, clamped to map bounds.
- **Performance requirement:** pre-render every sprite once into an offscreen 12×12 canvas
  (`makeSpriteCanvas(name)`, cached in a `Map`), then `drawImage` it scaled. Never loop
  `fillRect` per pixel inside the frame loop.
- Game loop: `requestAnimationFrame`. Logic is turn-based; the loop only animates movement
  interpolation, floating damage numbers and redraws.

## 2. Palette (exact hex, cold night theme)

```
bg          #05081a    void outside the map
floorA      #141c38    floor, variant A
floorB      #101731    floor, variant B (checker noise via hash of x,y)
wallDark    #1c2749    wall body
wallEdge    #334a86    top edge highlight of a wall
shadow      #04060f    unexplored
fogTint     rgba(5,8,26,0.62)   overlay for explored-but-not-visible tiles
player      #cfe3ff    body highlight
playerDark  #6f96d8    body shade
steel       #a9c2e6    weapon / chest fittings
gold        #ffd36e    coins (only warm accent allowed)
spider      #6a5a9e
ant         #7b6ba8
wolf        #8fa6c9
potRed      #e05a6a
potGreen    #4ee0a0
potWhite    #eef4ff
hpBar       #e05a6a
uiText      #cfe3ff
uiDim       #6f86b8
```

## 3. Sprite system

Sprites are **12 rows × 12 chars** strings. `.` = transparent. Other chars map to palette
keys via a per-sprite `map` object.

```js
const SPRITES = {
  player: { map: {a:'#cfe3ff', b:'#6f96d8', c:'#a9c2e6'},
            px: ["....aaaa....", /* exactly 12 strings, each exactly 12 chars */ ] },
  ...
};
```

Required sprite keys — all 11 must exist and be visually distinct:
`player`, `wall`, `chest`, `coin`, `weapon`, `spider`, `ant`, `wolf`,
`potionRed`, `potionGreen`, `potionWhite`.

Design hints: spider = round body + 4 legs each side; ant = three segments + antennae;
wolf = wider quadruped silhouette with pointed ears; potions = flask outline in `steel`
filled with the liquid colour; chest = box with `steel` band and lid line.

**Robustness (mandatory):** write `normalizeSprite(px)` that pads every row with `.` to the
longest row length and pads/crops the array to a square grid, so a miscounted row can never
crash rendering. Call it for every sprite at boot.

## 4. Dungeon generation

- Grid `48 × 34`, all `WALL` initially.
- Place 7–10 non-overlapping rectangular rooms (w,h between 5 and 10, 1-tile margin between
  rooms). Reject a room on overlap, max 200 attempts.
- Connect room `i` to room `i-1` with an L-shaped corridor between their centres
  (random horizontal-first / vertical-first). This is the room-to-room passage system.
- Player spawns in the centre of room 0. Stairs `>` (draw as a dark arch in `wallEdge`)
  spawn in the last room. Stepping on stairs generates a **new level**, keeps player stats,
  increments `depth`, and scales enemy count by `+1 per depth`.
- Populate rooms 1..n with: 2–4 enemies total per room mix, 1–3 coin piles, 0–1 chest,
  and potions/weapon per the drop table below. Never spawn anything on the stairs tile
  or the player spawn tile.

## 5. Stats & entities

Player: `hp`, `maxHp`, `str`. Start `maxHp = 10`, `hp = 10`, `str = 3`.

| enemy  | hp | str | aggro radius | move speed        |
|--------|----|-----|--------------|-------------------|
| ant    | 3  | 1   | 5            | 1 tile / turn     |
| spider | 5  | 2   | 6            | 1 tile / turn     |
| wolf   | 9  | 3   | 8            | 2 tiles / turn    |

## 6. Items

| item          | effect                                                        |
|---------------|---------------------------------------------------------------|
| potionRed     | `maxHp += 1` **permanent**, also heals 1                      |
| potionGreen   | `str += 1` **permanent**                                      |
| potionWhite   | `hp = maxHp` (heal to 100%), consumed                         |
| coin          | `gold += randInt(3,12)`, score only                           |
| weapon        | `str += 2` permanent, log "Znaleziono lepszą broń!"           |
| chest         | walking into it opens it → drops 1 random item from the table |

Items are picked up automatically by stepping on the tile. Drop table for chests:
40% coin, 20% potionRed, 20% potionGreen, 10% potionWhite, 10% weapon.

## 7. Turn-based combat

- One player action (one step, or one attack) = **one turn**. After it resolves, every
  enemy takes its turn.
- Player attack damage: `randInt(1, str) + Math.floor(str / 2)`.
- Enemy attack damage: `randInt(1, str)`.
- Enemy AI on its turn: if adjacent (4-directional) to the player → attack. Else if the
  player is within its aggro radius → step one tile greedily toward the player (prefer the
  axis with the larger distance; fall back to the other axis if blocked). Else idle.
- Enemy `hp <= 0` → removed, log line, `gold += 2`.
- Player `hp <= 0` → game over overlay with depth, gold, and a "Zagraj ponownie" button
  that fully restarts.
- Every hit spawns a floating damage number that rises and fades over ~600 ms, and a 100 ms
  attack lunge (the attacker interpolates 25% toward the target and back).

## 8. Mouse control

- **Click on an empty reachable floor tile** → BFS pathfind (4-directional, walls and
  enemies block) and the player walks the path, one tile per turn, ~110 ms per step.
- The walk is **interrupted** immediately if an enemy becomes adjacent, or if the player
  clicks again.
- **Click on an enemy**: if adjacent → attack it. If not adjacent → path to the nearest
  tile adjacent to it, then attack automatically on arrival.
- Hovering highlights the tile under the cursor with a 1 px `uiDim` outline; hovering an
  enemy shows its name and hp in the HUD.
- Keyboard is optional: WASD / arrows move one tile, bump-to-attack.

## 9. Visibility

- Tiles within radius 7 of the player are **visible** (full colour).
- Tiles seen before are **explored**: drawn, then covered with `fogTint`.
- Never-seen tiles are `shadow`. Enemies and items are drawn only on visible tiles.

## 10. HUD (drawn as HTML, not on canvas)

Bar above the canvas: `HP 8/10` with a red bar, `Siła: 3`, `Złoto: 47`, `Poziom: 2`.
Below the canvas: a scrolling log panel, last 6 messages, newest at the bottom, Polish text
(`"Pająk zadaje 2 obrażenia."`, `"Wypijasz zielony płyn. Siła +1!"`).
Page background `#05081a`, monospace font, `image-rendering: pixelated` on the canvas.

# SELF-CHECK AFTER WRITING THE FILE

Re-read the code and verify each item; fix it if any fails:

- [ ] All 11 sprites defined, each grid square after `normalizeSprite`.
- [ ] Sprites cached as offscreen canvases, not re-rasterised per frame.
- [ ] Rooms never overlap and every room is reachable from room 0.
- [ ] Red = permanent +1 maxHp, green = permanent +1 str, white = full heal. Not swapped.
- [ ] Click empty tile → walks. Click enemy → attacks. Enemy retaliates on its turn.
- [ ] Stairs generate a new level and preserve `hp/maxHp/str/gold`.
- [ ] Game over overlay restarts cleanly.
- [ ] No external resource of any kind is referenced.
- [ ] No syntax errors: the file parses and the game boots without a console error.
