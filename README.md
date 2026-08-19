# qwenRPG - a roguelike written entirely by a local model

An experiment: can a 27-billion-parameter model, running on a single consumer GPU, write a
complete, playable game from one specification prompt?

The answer is yes, with one caveat described below.

This repository contains the game (`game.html`), the original prompt (`prompt.md`), and an
account of what went wrong along the way - which turned out to be more interesting than the
result itself.

## TL;DR

- The game is a single HTML file with zero external dependencies. All graphics are drawn
  from code: no image files, no libraries.
- The code was written by `qwen3.8:27b` at Q4_K_M quantization, locally, on an RTX 3090.
- Harness: Qwen Code. Cline was tested but did not work out (see the token limit section).
- The only thing I fixed by hand was gameplay balance. Everything else came out of the
  prompt and the agent's own iterations.

## Setup

| item | value |
|---|---|
| model | `qwen3.8:27b`, Q4_K_M, 27.3B parameters |
| runtime | Ollama (requires 0.32.12+) |
| harness | Qwen Code |
| GPU | RTX 3090, 24 GB |
| throughput | ~50 tok/s during generation |
| power draw | ~328 W under load |
| temperatures | core 74°C, hot spot 90°C, memory 86°C |

The model is dense and multimodal, with hybrid attention - only 16 of its 64 layers use
full attention, the rest are linear attention. In practice this means context length does
not hurt throughput the way it does in a classic transformer. The model also ships with a
built-in multi-token prediction head, which combined with `draft_num_predict 4` in Ollama's
default parameters probably explains why 50 tok/s lands above the theoretical ceiling
implied by memory bandwidth alone.

## The prompt

Full text in `prompt.md`. The design decisions that mattered:

**Sprites as 12x12 character masks.** Graphics are generated from string arrays where `.`
means transparent and other characters map to a palette. I deliberately dropped from 16x16
because smaller models consistently miscount characters per row. On top of that, a mandatory
`normalizeSprite()` function pads short rows - so a miscount degrades the artwork instead of
crashing the renderer.

**A fixed hex palette.** Instead of describing "cold night colours", a concrete list of
named values. The model drifted from it anyway (see known issues), but it would have been
worse without.

**A self-check list at the end.** Nine items to verify after writing the file. The model
expanded this on its own into a seven-step manual test plan I never asked for.

## The token limit problem

This is the actual substance of the experiment and the reason I am writing it up at all.

The first attempt in **Cline** cut off mid-reasoning at exactly 8192 tokens. A round power
of two is an unmistakable signature - no model stops generating there of its own accord.
This was a client-side limit, not the model and not the context window (which I had set to
131072).

The cause is structural: Cline creates a new file through a single `write_to_file` call,
meaning the entire contents must fit in one response. With thinking mode enabled, which can
eat 5-6 thousand tokens, there is not much budget left for code.

**Qwen Code** did better because it splits work across turns and each turn gets a fresh
budget. But on the chunk containing FOV, BFS pathfinding and enemy AI it hit the ceiling
too - this time as a loop of five consecutive `Response truncated due to token limits`
messages with progressively shorter reasoning blocks. That is most likely the built-in
automatic limit escalation running into its own cap.

### The fix

The key is `samplingParams.max_tokens`, but it has to live **inside the model entry under
`modelProviders`**, not at the `model` level. Placed wrong, it is silently ignored (Qwen Code
does at least warn about this at startup).

```json
{
  "env": { "OLLAMA_API_KEY": "ollama" },
  "model": { "name": "qwen3.8:27b" },
  "modelProviders": {
    "openai": [
      {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "envKey": "OLLAMA_API_KEY",
        "id": "qwen3.8:27b",
        "name": "qwen3.8:27b (Ollama)",
        "generationConfig": {
          "contextWindowSize": 262144,
          "samplingParams": { "max_tokens": 32000 }
        }
      }
    ]
  },
  "security": {
    "auth": {
      "baseUrl": "http://127.0.0.1:11434/v1",
      "selectedType": "openai"
    }
  },
  "$version": 4
}
```

Note: setting an explicit limit **disables automatic escalation**, so pick a generous value
rather than a tight one.

Second note: do not touch `temperature`. With thinking mode enabled, moving toward greedy
decoding triggers repetition loops. The defaults of 1.0 / top_p 0.95 / top_k 20 are chosen
deliberately.

## What the model did, and what I did

The model generated all of the code: the dungeon generator (rooms plus L-shaped corridors),
BFS pathfinding with turn-by-turn movement, field of view with memory of explored tiles, the
turn-based combat system, every sprite, the HUD and the event log.

I fixed the **balance** and extended the game with additional systems (XP, character levels,
keys, herbs). The balance from the prompt was indefensible: enemies had stats comparable to
the player and could surround them three or four at a time. In turn-based combat every extra
adjacent enemy adds damage per turn linearly, while the player still only hits one. That is
a flaw in my specification, not in the execution.

## Known flaws in the prompt

I am leaving these in `prompt.md` unfixed, because they are part of the story:

1. `temperature: 0.25` - the wrong value for a model with thinking mode.
2. The balance table does not account for fighting multiple enemies at once. It needs a cap
   on how many enemies can be adjacent to the player simultaneously.
3. Balance values are scattered through the specification instead of sitting in a single
   `BALANCE` object at the top of the file. That turns balance iteration into a hunt for
   magic numbers.

## Known issues in the game

- The palette drifted toward warm browns instead of the specified navy tones. The floor
  stayed cold so contrast still works, but the mood is not the one I ordered.
- The log panel overlaps the canvas and hides the bottom-left corner of the map.
- The camera is not symmetrically centred - the clamp to map bounds only works correctly in
  one direction.

## Takeaways

A local model on a single consumer GPU wrote a complete, working game. A year ago that was
not realistic in one pass.

The bottleneck was not the model but the harness configuration. The same model failed in one
tool and delivered in another, with identical weights and an identical prompt. That is a
practical lesson for anyone building their own agent loop: tool call format and per-response
token budget matter about as much as model quality.

What the model still will not catch on its own is game design. The code was correct on the
first pass, but the game was unplayable because the numbers in my specification were wrong.
The model did exactly what I asked for.

## Licence

Prompt, generated game and the Qwen3.8-27B weights are all released under Apache 2.0.
