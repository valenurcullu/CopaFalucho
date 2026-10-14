"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { IconoCerrar, IconoCompartir } from "@/components/ui/iconos";
import { marca } from "@/config/marca";

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLAVE_DESCARTE = "falucho:instalar-descartado";
const DIAS_SIN_MOLESTAR = 14;
const DEMORA_MS = 4000;

function descartadoHacePoco(): boolean {
  try {
    const valor = localStorage.getItem(CLAVE_DESCARTE);
    return !!valor && Date.now() - Number(valor) < DIAS_SIN_MOLESTAR * 864e5;
  } catch {
    return false;
  }
}

function recordarDescarte() {
  try {
    localStorage.setItem(CLAVE_DESCARTE, String(Date.now()));
  } catch {
    // Sin almacenamiento (modo privado): se vuelve a mostrar la próxima vez.
  }
}

const yaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const esIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * Invita a instalar la app. En Android/Chrome usa el diálogo nativo; en
 * iPhone explica cómo agregarla a la pantalla de inicio desde Compartir.
 */
export function InvitacionInstalar() {
  const [modo, setModo] = useState<"oculta" | "nativa" | "ios">("oculta");
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    if (yaInstalada() || descartadoHacePoco()) return;
    let demora: ReturnType<typeof setTimeout> | undefined;

    const alPedirInstalacion = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
      demora = setTimeout(() => setModo("nativa"), DEMORA_MS);
    };
    window.addEventListener("beforeinstallprompt", alPedirInstalacion);
    if (esIos()) demora = setTimeout(() => setModo("ios"), DEMORA_MS);

    const alInstalar = () => setModo("oculta");
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      clearTimeout(demora);
      window.removeEventListener("beforeinstallprompt", alPedirInstalacion);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (modo === "oculta") return null;

  const cerrar = () => {
    recordarDescarte();
    setModo("oculta");
  };

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "dismissed") recordarDescarte();
    setModo("oculta");
  };

  return (
    <aside
      aria-label="Instalar la app"
      className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-superficie p-4 shadow-2xl ring-1 ring-borde"
    >
      <div className="flex items-start gap-3">
        <Image src={marca.logo.src} alt="" width={30} height={46} className="h-12 w-auto" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instalá {marca.nombreTorneo} en tu celular</p>
          {modo === "nativa" ? (
            <p className="text-sm text-texto-suave">Se abre como una app y funciona aunque no haya señal en la cancha.</p>
          ) : (
            <ol className="mt-1 space-y-1 text-sm text-texto-suave">
              <li>
                1. Tocá <IconoCompartir className="inline size-4 align-[-2px] text-foco" aria-label="Compartir" /> <strong>Compartir</strong> en la barra del navegador.
              </li>
              <li>
                2. Elegí <strong>Agregar a inicio</strong>.
              </li>
            </ol>
          )}
        </div>
        <button type="button" onClick={cerrar} aria-label="Cerrar" className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-texto-suave">
          <IconoCerrar className="size-5" />
        </button>
      </div>
      {modo === "nativa" && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={cerrar} className="min-h-11 flex-1 rounded-full font-semibold text-texto-suave ring-1 ring-borde">
            Ahora no
          </button>
          <button type="button" onClick={instalar} className="min-h-11 flex-1 rounded-full bg-marca font-semibold text-marca-texto">
            Instalar
          </button>
        </div>
      )}
    </aside>
  );
}
