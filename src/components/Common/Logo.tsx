import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 22, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={{ transform: "rotate(-10deg)", flexShrink: 0 }}
    >
      <path d="M7 2h10l4 5v15H3V7z" fill="var(--lime)" />
      <circle cx="12" cy="7" r="1.8" fill="var(--bg)" />
    </svg>
  );
};
