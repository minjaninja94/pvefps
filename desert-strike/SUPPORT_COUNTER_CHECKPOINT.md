# Support rally, anti-special counters, sniper targeting, and visible wallet

Huanglong's multiplayer idle branch previously followed the nearest non-support ally and had no fallback movement without one. Continuous fresh rear troops could hold supports near spawn while the frontline moved away. Solo also followed the first listed healthy ally. Both engines now use shared rally selection: injured fighters / advanced fighters in the current lane first, other lanes if none are available, excluding dead units, hatchlings and stationary guardians. With no fighters, supports move to a safe rally before the friendly forward tower instead of idling at spawn or marching alone into an enemy base. Nearby injured patients still trigger ordinary healing; Huanglong retains its one-use area heal and three-per-wave production.

Anti-air now prioritizes every role-six special, including ground trucks, cavalry and mechs. Ground-special damage no longer has the old 0.78 penalty: it receives the normal 1.55–2.0 wave-dependent counter multiplier, just like aircraft. Ground units remain ground units and retain antiarmor/armor/artillery interactions.

Sniper changes are shared by solo and multiplayer:
- Cost 380, damage 300 before faction/global modifiers, reload 4.8 s, aim 0.65 s and armor penetration 50% remain unchanged.
- Base range 370 → 390; can engage aircraft as well as ground targets.
- Precision multiplier 1.6 against armored and all role-six specials, 1.15 against riflemen. Good matchups: special / armor / rifle; weaknesses: assault / assassin. Rifles, armor and specials show sniper vulnerability in their definitions.
- Prioritize valuable targets already in range through a melee screen, avoiding pursuit of far-away priority units when usable targets are near.
- Reserve pending lethal shots so different snipers can select different victims. Solo includes already-fired sniper projectiles. Solo builds its reservation map once per targeting query rather than rescanning all allies for every candidate; multiplayer shares a per-tick claim map.
- Cards, detailed matchups and tooltips use `🪽♞` / “비행·지상 특수” for the combined role-six target class. Target-specific battlefield badges still distinguish actual ground cavalry, mech and aircraft.

The lobby now displays the skin-point balance directly above player level, using the same 17 px font size as ranked results. It uses the existing authoritative wallet and refresh event; guest/loading states do not imply an available zero balance. Purchase deductions and match reward updates refresh this number.

## Validation

40 relevant Node checks passed across support/sniper behavior, all ten faction definitions, real solo/host hit parity, wave counters, specialist production/AI, stealth, multiplayer UI, mocked WebRTC and music progression. Added scenarios verify:
- support advances with no army, follows a distant front despite nearby fresh troops, casts its heal and is consumed;
- two snipers pick separate rear riflemen through a melee screen and kill them through real aim/shot resolution;
- all 100 sniper-faction / rifle-faction pairs one-shot ordinary unupgraded riflemen in both engines;
- anti-air targets ground specials and snipers target all ten specials without changing their movement layer;
- a lone sniper still loses to four riflemen (380 versus 400 CR), preserving mass-rifle pressure.

The shop browser regression verifies point display at 3000, 1800 and 3300, font-size parity, purchases, wallet/account isolation and rewards. An additional browser inspection verified both real army card renderers show `🪽♞`, the sniper's new strengths/weaknesses, and points sit above the level.

These deterministic scenarios verify the requested behavior, not every possible augmented late-game composition. Existing ground-special checkpoint counter lists are superseded by this change.
