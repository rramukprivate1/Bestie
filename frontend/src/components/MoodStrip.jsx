// Maps any emotion word to a consistent, distinct hue - procedural, not a
// hardcoded "good/bad" list, so it works for whatever word the model
// produces and doesn't pass judgment on any given feeling.
function emotionToColor(emotion) {
  if (!emotion) return null;
  let hash = 0;
  for (let i = 0; i < emotion.length; i++) {
    hash = emotion.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 42%, 58%)`;
}

export default function MoodStrip({ days }) {
  if (!days || days.length === 0) return null;

  return (
    <div>
      <div className="flex gap-1.5">
        {days.map((day) => {
          const color = emotionToColor(day.dominant);
          const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                title={day.dominant ? `${day.date}: mostly ${day.dominant}` : `${day.date}: no data`}
                className="w-full aspect-square rounded-lg border border-surface-2"
                style={{ backgroundColor: color || 'transparent' }}
              />
              <span className="text-[10px] text-muted/60">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
