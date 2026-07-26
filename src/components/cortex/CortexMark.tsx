interface Props {
  size?: number;
  className?: string;
}

/** CORTEX insignia — official brass-and-cyan intelligence core emblem. */
export function CortexMark({ size = 28, className }: Props) {
  return (
    <img
      src="/image.png"
      alt="CORTEX insignia"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}
