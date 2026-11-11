export default function VerdictIcon({ blocked }) {
  return (
    <span className="verdict-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        {blocked ? (
          <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" />
        ) : (
          <path d="M3.8 8.4 L6.7 11.2 L12.2 4.9" />
        )}
      </svg>
    </span>
  );
}
