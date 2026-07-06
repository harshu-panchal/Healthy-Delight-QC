import { ReactNode } from "react";
import { getSectionDotColor } from "../utils/sectionHeadingColors";

interface SectionHeadingProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  colorSeed?: string | number;
  className?: string;
}

export default function SectionHeading({
  children,
  as: Tag = "h2",
  colorSeed,
  className = "",
}: SectionHeadingProps) {
  const seed =
    colorSeed ??
    (typeof children === "string" ? children : String(children ?? "section"));
  const dotColor = getSectionDotColor(seed);

  return (
    <Tag className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden>
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
          style={{ backgroundColor: dotColor }}
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      </span>
      <span>{children}</span>
    </Tag>
  );
}
