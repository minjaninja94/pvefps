# Desert Front soundtrack assets

The two soundtracks live here:

- `lobby-theme.mp3`: lobby music (the original lobby BGM)
- `battle-theme.mp3`: music from the owner's newly supplied battle video, extracted to an MP3

Both tracks loop. Starting solo, online multiplayer, or practice pauses the lobby track and starts the battle track at its beginning. Winning/losing stops the battle track; returning to the lobby resumes the lobby track. The lobby BGM switch controls both tracks and remembers the visitor's choice. Browsers may require a user gesture to play.

**Asset upload:** The GitHub text-only code integration does not embed MP3 binary media. Upload the supplied `desert-front-battle-theme.mp3` as `battle-theme.mp3` in this folder. If the previous lobby track is also missing, place it here as `lobby-theme.mp3`.
