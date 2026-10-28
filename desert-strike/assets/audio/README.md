# Desert Front soundtrack assets

- `lobby-theme.mp3`: lobby music (provided separately by the project owner; upload pending)
- `battle-theme.mp3`: battle music extracted from the provided video (**committed to this directory**)

The browser's BGM controller starts the battle track on solo, multiplayer and practice entry. Music loops at 35% volume during battles. When a match ends the battle track stops; on returning to the lobby, the lobby track resumes if `lobby-theme.mp3` has been supplied.

The existing lobby BGM toggle controls both tracks and persists its setting. Browser autoplay restrictions may require a click or key press before the first playback.
