---
name: Screenshot
description: Capture a headless-browser screenshot of a running page or canvas and READ the image to verify visuals. Use whenever a change affects UI or canvas rendering.
metadata:
  opencode/autoinvoke: false
---

# Screenshot — visual verification

**Never claim to have seen a live page. Capture it, then read the image.**

```sh
node scripts/screenshot.mjs --url http://localhost:8095/ --out shot.png --size 1000x900 --budget 5000
```

Then read `shot.png` with the image-reading tool. Iterate: change → re-capture → look again — this closes
the loop for visual work that workers cannot self-verify.

- Uses a headless **Edge/Chrome**; set `BROWSER` to override the binary. Cross-platform.
- `--virtual-time-budget` lets the page's JS run before the shot — enough for a canvas game to render a frame.
- Start a running app as a **background** process first (never a foreground server).
- For a canvas/game, one frame is enough to judge layout, colour, and geometry.
