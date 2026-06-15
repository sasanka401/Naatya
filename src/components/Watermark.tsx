interface Props {
  label: string;
}

/**
 * Diagonal repeating watermark overlay — stamps the viewer's
 * email + timestamp across script content for leak traceability.
 */
export function Watermark({ label }: Props) {
  const cells = Array.from({ length: 48 });

  return (
    <div className="watermark-layer" aria-hidden="true">
      {cells.map((_, i) => (
        <span className="watermark-text" key={i}>{label}</span>
      ))}
    </div>
  );
}
