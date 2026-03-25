import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "icon" | "full";
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export default function Logo({
  variant = "full",
  className,
  iconClassName,
  textClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 40 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-8 w-auto shrink-0", iconClassName)}
        aria-hidden="true"
      >
        {/* Cloud bumps */}
        <circle cx={12} cy={17} r={7} fill="#2563eb" />
        <circle cx={21} cy={11} r={9} fill="#2563eb" />
        <circle cx={30} cy={17} r={5} fill="#2563eb" />
        {/* Document body */}
        <rect x={5} y={17} width={30} height={23} rx={4} fill="#2563eb" />
        {/* Invoice lines */}
        <line
          x1={12} y1={25} x2={28} y2={25}
          stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8}
        />
        <line
          x1={12} y1={30} x2={22} y2={30}
          stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.5}
        />
        <line
          x1={12} y1={35} x2={26} y2={35}
          stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.3}
        />
      </svg>
      {variant === "full" && (
        <span
          className={cn(
            "font-display text-lg font-semibold tracking-tight",
            textClassName
          )}
        >
          fatturami<span className="text-blue-500">.cloud</span>
        </span>
      )}
    </span>
  );
}
