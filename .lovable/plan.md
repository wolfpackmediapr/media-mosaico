# Add Copy Text button to Social Post cards

Add a copy-to-clipboard button on each post card in Redes Sociales, matching the pattern used in `AlertResponseDialog` and `CopyTextButton` (Copy / CheckCheck icons, sonner toast, 2s reset).

## Scope
- File: `src/components/social/SocialPostCard.tsx` only.
- No changes to data fetching, types, or other cards.

## Behavior
- Button placed in the card header (top-right, next to the date) as a small ghost icon button, so it stays visible whether or not the card has an image.
- Copies the post's full caption/copy assembled as:
  - `title`
  - blank line
  - plain-text version of `description` (strip HTML via a temp DOM element so users get the caption, not markup)
  - blank line
  - `link`
- On click: write to clipboard, show `toast.success("Texto copiado al portapapeles")`, swap icon to green `CheckCheck` for 2s. On failure: `toast.error(...)`.
- `aria-label` and `title` = "Copiar publicación". `stopPropagation` on click so it never triggers the card's "View Original Post" action.

## Out of scope
- Spotlight dialog, dashboard combined feed, and other post surfaces (can follow in a separate pass if desired).
