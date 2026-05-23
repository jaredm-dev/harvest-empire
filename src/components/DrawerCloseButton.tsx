// Reusable close button for the bottom-sheet drawers. Larger hit target,
// proper accessible label (a screen reader would otherwise just announce
// "×" or "multiplication sign"), and explicit type="button" so it never
// accidentally submits a form.
export default function DrawerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      style={{
        background: 'rgba(148, 163, 184, 0.12)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: '#cbd5e1',
        width: 36,
        height: 36,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 22,
        lineHeight: 1,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      ×
    </button>
  );
}
