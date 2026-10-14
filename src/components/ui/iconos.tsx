import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoFixture = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M7.5 17h3M13.5 13.5h3" />
  </Base>
);

export const IconoTablas = (p: Props) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <path d="M8 4v16" />
  </Base>
);

export const IconoLlaves = (p: Props) => (
  <Base {...p}>
    <path d="M3 5h5v5H3M3 14h5v5H3" />
    <path d="M8 7.5h3v9H8M11 12h4" />
    <path d="M15 9h6v6h-6z" />
  </Base>
);

export const IconoStats = (p: Props) => (
  <Base {...p}>
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </Base>
);

export const IconoEquipos = (p: Props) => (
  <Base {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z" />
    <path d="M9 12h6" />
  </Base>
);

export const IconoActualizar = (p: Props) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Base>
);

export const IconoVolver = (p: Props) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
);

export const IconoFlecha = (p: Props) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
);

export const IconoSinSenal = (p: Props) => (
  <Base {...p}>
    <path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.5-1.7M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5" />
    <circle cx="12" cy="20" r="0.5" fill="currentColor" />
  </Base>
);

export const IconoCompartir = (p: Props) => (
  <Base {...p}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Base>
);

export const IconoCerrar = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export function IconoPelota(p: Props) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12 7.2 4 2.9-1.5 4.8h-5L8 10.1Z" fill="currentColor" />
    </svg>
  );
}

/** Tarjeta de amonestación (rectangulito de color). */
export function Tarjeta({ tipo, className = "" }: { tipo: "amarilla" | "roja"; className?: string }) {
  return (
    <span
      aria-label={tipo === "amarilla" ? "Tarjeta amarilla" : "Tarjeta roja"}
      role="img"
      className={`inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] ${tipo === "amarilla" ? "bg-amarilla" : "bg-roja"} ${className}`}
    />
  );
}
