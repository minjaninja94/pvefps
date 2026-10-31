# Multiplayer presentation and obsidian visibility

- Obsidian now uses grayscale(.9) brightness(1.3) contrast(.8), replacing brightness(.48). Ownership, prices and identifiers are unchanged.
- Multiplayer renders at up to 30 FPS instead of roughly 12 FPS. A separate visual tracker interpolates the latest visible unit positions over the measured snapshot interval (100–250 ms). No extrapolation or combat prediction. Hidden/dead/removed units never survive through the tracker; teleports, lane changes and match restarts reset positions. Health, opacity and membership always come from the latest authoritative snapshot.
- Filtered unit frames use a bounded 512-entry canvas LRU instead of applying the same chroma filter on every unit draw. Lane view avoids redundant fallback frame generation. Snapshot construction skips closed/backpressured peer channels. Unchanged tactical-position data skips DOM reconstruction.
- Both battle views draw faction-specific role marks above units, with the same dark backing and ally/enemy colors as solo. Full overview now uses the shared skin/chroma renderer and keeps different faction/skin stacks separate. Upper/lower lane backgrounds and dividers have less emphasis; units are not dimmed.
- The 3300-world-unit map and all authoritative combat rules remain unchanged. This addresses presentation stutter without changing travel times or balance.

## Validation

- Motion tests: intermediate positions, jitter continuity, bounded movement, latest health/opacity, lane changes, teleports, removed/hidden units and restarted matches.
- Actual mocked WebRTC integration: 1v1, classic, 2/3-player teams, coop, augment and prism rooms pass. Production UI, balance parity, counter pressure, original art and tower sprite tests pass.
- Shop/rewards browser regression passes, including actual chroma pixels, purchases and account isolation.
- New browser scenario renders 360 units, checks selected obsidian skins reach the overview renderer, verifies marks in both views and compares actual pixel luminance. Reference headless Chromium run: median full-overview draw 7.8 ms, p95 30.3 ms; default infantry luminance 68.23 versus obsidian 93.18. Timings are informational, not a flaky test threshold. Environment uses software rendering and no CJK fonts.
- These are local synthetic/network-mock checks, not proof of real-world Internet RTT improvement. Position smoothing deliberately buffers one snapshot interval; server resolution remains authoritative.

Run:
```
node --test desert-strike/tests/multiplayer-motion.test.cjs desert-strike/tests/skin-shop.test.cjs desert-strike/smoke-trilane-network.test.cjs desert-strike/smoke-balance-parity.test.cjs
node --test desert-strike/smoke-mp-production-ui.test.cjs desert-strike/smoke-counter-pressure.test.cjs desert-strike/smoke-original-art.test.cjs desert-strike/smoke-tower-sprites.test.cjs
```
Browser checks use Playwright and a local static server at port 8765, serving the repository root: `tests/multiplayer-presentation-browser.cjs`, `tests/skin-shop-browser.cjs`.

## Compact production board

Multiplayer now uses the solo 15-column × 5-row layout with all 75 production slots per lane intact. Empty boards measure exactly the same as solo: 1020 × 326 px on desktop and 970 × 291 px at a 390 px mobile viewport. Narrow panels scroll horizontally, with no inner vertical scrolling. Role portraits are 36 px, and constructing cells can grow to 83 px like solo to keep progress labels readable. Lane tabs keep at least 44 px touch height. Scrolling across slots cannot change the selected production lane; tabs and arrow buttons remain available.

Validated in browser viewports 1440, 980 and 390 px: 15 columns, 75 slots, matching solo height, no vertical overflow, and switching all three lanes. The production UI regression also verifies horizontal board gestures cannot switch lanes or spend credits accidentally.
