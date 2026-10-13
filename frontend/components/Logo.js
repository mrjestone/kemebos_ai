import Image from "next/image";

// The crest is a small raster (105x142), so keep it at or below ~1x size.
export default function Logo({ size = 72, className = "" }) {
  return (
    <Image
      src="/logo.png"
      alt="Kemebos school crest"
      width={size}
      height={Math.round(size * (142 / 105))}
      priority
      className={className}
    />
  );
}
