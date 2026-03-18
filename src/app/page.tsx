"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLICKS_STORAGE_KEY,
  CONFIG_STORAGE_KEY,
  SYNC_CHANNEL,
  defaultConfig,
  readConfigFromStorage,
  type LinkBioConfig,
} from "../lib/linkBioConfig";

export default function Home() {
  const [cfg, setCfg] = useState<LinkBioConfig>(() =>
    readConfigFromStorage(typeof window === "undefined" ? undefined : window.localStorage),
  );

  const links = cfg.links;

  const renderIcon = (kind: string) => {
    switch (kind) {
      case "portfolio":
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M4 12h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        );
      case "github":
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M12 2.5a9.5 9.5 0 0 0-3 18.52c.48.1.66-.2.66-.46v-1.7c-2.7.6-3.26-1.15-3.26-1.15-.44-1.12-1.08-1.42-1.08-1.42-.88-.6.06-.6.06-.6 1 .07 1.52 1.02 1.52 1.02.88 1.52 2.32 1.08 2.88.83.1-.66.34-1.08.62-1.34-2.16-.24-4.44-1.08-4.44-4.8 0-1.06.38-1.92 1-2.6-.1-.24-.44-1.22.1-2.54 0 0 .82-.26 2.7 1a9.26 9.26 0 0 1 4.92 0c1.88-1.26 2.7-1 2.7-1 .54 1.32.2 2.3.1 2.54.62.68 1 1.54 1 2.6 0 3.74-2.28 4.56-4.46 4.8.34.3.66.9.66 1.8v2.66c0 .26.18.56.66.46A9.5 9.5 0 0 0 12 2.5Z"
              fill="currentColor"
            />
          </svg>
        );
      case "twitter":
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M18.5 3.5h3l-6.6 7.54L22.2 20.5h-5.7l-4.46-5.5-4.82 5.5H4.2l7.06-8.07L2 3.5h5.84l4.02 5.06L18.5 3.5Zm-1.06 15.2h1.66L7.56 5.2H5.78L17.44 18.7Z"
              fill="currentColor"
            />
          </svg>
        );
      case "youtube":
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M21.6 7.2a3 3 0 0 0-2.12-2.12C17.62 4.6 12 4.6 12 4.6s-5.62 0-7.48.48A3 3 0 0 0 2.4 7.2C2 9.06 2 12 2 12s0 2.94.4 4.8a3 3 0 0 0 2.12 2.12c1.86.48 7.48.48 7.48.48s5.62 0 7.48-.48a3 3 0 0 0 2.12-2.12c.4-1.86.4-4.8.4-4.8s0-2.94-.4-4.8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M10.2 9.6v4.8L14.4 12l-4.2-2.4Z" fill="currentColor" />
          </svg>
        );
      case "email":
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M6.6 7.6 12 12l5.4-4.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 4.93"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 19.07"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  const syncConfig = useCallback(() => {
    setCfg(
      readConfigFromStorage(
        typeof window === "undefined" ? undefined : window.localStorage,
      ),
    );
  }, []);

  useEffect(() => {
    // Ensure defaults exist at least once
    if (typeof window === "undefined") return;
    const storage = window.localStorage;
    const current = readConfigFromStorage(storage);
    if (!storage.getItem(CONFIG_STORAGE_KEY)) {
      storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(defaultConfig()));
    }
    setCfg(current);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CONFIG_STORAGE_KEY) return;
      syncConfig();
    };
    window.addEventListener("storage", onStorage);

    const bc =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL) : null;
    if (bc) {
      bc.onmessage = (event) => {
        if (event?.data?.type !== "sync") return;
        syncConfig();
      };
    }

    const onFocus = () => syncConfig();
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncConfig();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncConfig]);

  const [clicks, setClicks] = useState<Record<string, number>>({});

  const seedClicks = useCallback(() => {
    const seeded: Record<string, number> = {};
    for (const link of links) seeded[link.id] = 100;
    return seeded;
  }, [links]);

  const readClicks = useCallback(() => {
    try {
      const raw = localStorage.getItem(CLICKS_STORAGE_KEY);
      if (!raw) return seedClicks();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: Record<string, number> = seedClicks();
      for (const link of links) {
        const v = parsed[link.id];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) next[link.id] = v;
      }
      return next;
    } catch {
      return seedClicks();
    }
  }, [links, seedClicks]);

  const writeClicks = useCallback((next: Record<string, number>) => {
    localStorage.setItem(CLICKS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const initial = readClicks();
    setClicks(initial);
    writeClicks(initial);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CLICKS_STORAGE_KEY) return;
      setClicks(readClicks());
    };
    window.addEventListener("storage", onStorage);

    const bc =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL) : null;
    if (bc) {
      bc.onmessage = (event) => {
        if (event?.data?.type !== "sync") return;
        setClicks(readClicks());
      };
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, [readClicks, writeClicks]);

  const increment = useCallback(
    (id: string) => {
      setClicks((prev) => {
        const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
        try {
          writeClicks(next);
          if (typeof BroadcastChannel !== "undefined") {
            new BroadcastChannel(SYNC_CHANNEL).postMessage({ type: "sync" });
          }
        } catch {
          // ignore
        }
        return next;
      });
    },
    [writeClicks],
  );

  const formatCount = (n: number | undefined) => {
    const v = typeof n === "number" ? n : 0;
    if (v >= 1_000_000) return `${Math.floor(v / 1_000_000)}M+`;
    if (v >= 10_000) return `${Math.floor(v / 1000)}K+`;
    if (v >= 100) return `${Math.floor(v / 100)}00+`;
    return `${v}`;
  };

  const displayHost = (url: string) => {
    try {
      const u = new URL(url);
      if (u.protocol === "mailto:") return "email";
      return u.host.replace("www.", "");
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
    }
  };

  return (
    <div
      className="min-h-full w-full"
      style={{
        background:
          "radial-gradient(900px circle at 20% 12%, rgba(229,9,20,0.18), rgba(229,9,20,0) 55%), radial-gradient(700px circle at 90% 20%, rgba(255,255,255,0.06), rgba(255,255,255,0) 45%), radial-gradient(900px circle at 40% 110%, rgba(229,9,20,0.10), rgba(229,9,20,0) 60%), linear-gradient(180deg, #0a0a0a 0%, #070707 100%)",
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <main className="mx-auto w-full max-w-[480px] px-5 pb-10 pt-12">
        <section className="flex flex-col items-center text-center">
          {cfg.profile.avatarDataUrl ? (
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.08), 0 16px 50px rgba(0,0,0,0.55)",
              }}
            >
              <img
                src={cfg.profile.avatarDataUrl}
                alt={cfg.profile.name}
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "inset 0 0 0 1px rgba(229,9,20,0.25)" }}
              />
            </div>
          ) : (
            <div
              className="relative h-24 w-24 rounded-full"
              style={{
                background:
                  "radial-gradient(120px circle at 30% 30%, rgba(229,9,20,0.35), rgba(229,9,20,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.08), 0 16px 50px rgba(0,0,0,0.55)",
              }}
            >
              <div className="absolute inset-[10px] rounded-full bg-[#0a0a0a]" />
              <div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "inset 0 0 0 1px rgba(229,9,20,0.35)" }}
              />
            </div>
          )}

          <h1
            className="mt-5 text-[28px] font-semibold tracking-tight text-zinc-50"
            style={{ animation: "fadeUp 520ms ease-out both" }}
          >
            {cfg.profile.name}
          </h1>
          <p
            className="mt-2 max-w-[36ch] text-[15px] leading-6 text-zinc-300"
            style={{
              animation: "fadeUp 520ms ease-out both",
              animationDelay: "90ms",
            }}
          >
            {cfg.profile.bio}
          </p>
        </section>

        <section className="mt-8 space-y-3">
          {links.map((link, idx) => (
            <a
              key={link.id}
              href={link.url}
              target={link.url.startsWith("http") ? "_blank" : undefined}
              rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
              onPointerDown={() => increment(link.id)}
              className="group block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur transition duration-200 will-change-transform hover:-translate-y-0.5 hover:scale-[1.01] hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_0_0_1px_rgba(229,9,20,0.25),0_20px_60px_rgba(0,0,0,0.55),0_0_28px_rgba(229,9,20,0.18)] active:translate-y-[1px] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/70"
              style={{
                animation: "fadeUp 540ms cubic-bezier(0.2, 0.9, 0.2, 1) both",
                animationDelay: `${160 + idx * 70}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-[#E50914] ring-1 ring-white/10 transition duration-200 group-hover:bg-white/[0.06] group-hover:ring-white/15">
                  {renderIcon(link.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-zinc-50">
                      {link.title}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="truncate text-[12.5px] text-zinc-400">
                      {displayHost(link.url)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-zinc-400">
                    {link.subtitle}
                  </p>
                </div>
                <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.02] text-zinc-300 ring-1 ring-white/10 transition duration-200 group-hover:text-zinc-50 group-hover:ring-white/15">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                    <path
                      d="M9 6h9v9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 6 7 17"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[12px] font-medium text-zinc-300">
                  🔥 {formatCount(clicks[link.id])} clicks
                </span>
              </div>
            </a>
          ))}
        </section>

        <footer
          className="mt-10 text-center text-[13px] text-zinc-500"
          style={{
            animation: "fadeUp 520ms ease-out both",
            animationDelay: `${160 + links.length * 70 + 80}ms`,
          }}
        >
          Made with 💚 and vibes
        </footer>
      </main>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
      `}</style>
    </div>
  );
}
