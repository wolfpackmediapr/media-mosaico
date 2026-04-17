
## Issue

I edited the wrong component. The player visible on the Radio page (the green card with "Radio Transcription" subtitle and tracklist below) is `MusicCard` rendered by `MediaControls.tsx`. The `AudioPlayer` I added sticky mode to is a different, secondary component used inside `AudioFileItem`.

## Plan: Add floating/PiP mode to MusicCard (the actual visible player)

### File: `src/components/radio/MediaControls.tsx`

Wrap the `<MusicCard>` in a div that uses `useStickyState`, and pass a toggle button into MusicCard (or render the button as an overlay on the wrapper).

Cleanest approach: handle sticky entirely in `MediaControls.tsx` — wrapper div + floating toggle button in the corner — without modifying `MusicCard` internals.

```text
<div ref={stickyRef} className={cn(
  "relative transition-all",
  isSticky && "fixed bottom-4 right-4 w-[26rem] max-w-[calc(100vw-2rem)] z-50 shadow-2xl"
)}>
  <Button onClick={toggleSticky} className="absolute top-2 right-2 z-10" />
  <MusicCard ... />
</div>
```

- Persist key: `radio-musiccard-sticky`, sessionStorage
- Icons: `PictureInPicture2` (expand) / `Minimize2` (restore)
- When sticky: fixed bottom-right, ~26rem wide, drop shadow, backdrop blur, z-50
- Tracklist (`TrackList.tsx`) stays in normal flow so user can keep scrolling and click tracks; clicked track loads into the floating player

### Cleanup

Revert the sticky changes in `src/components/radio/audio-player/index.tsx` since that component isn't the main player. Keep the file functional but remove the toggle/wrapper — back to original layout.

### Scope
- 2 files modified (`MediaControls.tsx` add sticky; `audio-player/index.tsx` revert)
- No backend, no MusicCard internal changes
- Reuses existing `useStickyState` hook
