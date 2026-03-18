"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SYNC_CHANNEL,
  sanitizeConfig,
  defaultConfig,
  readConfigFromStorage,
  writeConfigToStorage,
  type LinkBioConfig,
  type LinkKind,
  type LinkItem,
} from "../../lib/linkBioConfig";

function sanitizeId(id: string) {
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return cleaned || `link-${Math.random().toString(16).slice(2)}`;
}

function kindOptions(): { value: LinkKind; label: string }[] {
  return [
    { value: "portfolio", label: "Portfolio" },
    { value: "github", label: "GitHub" },
    { value: "twitter", label: "Twitter" },
    { value: "youtube", label: "YouTube" },
    { value: "email", label: "Email" },
    { value: "link", label: "Generic link" },
  ];
}

const ADMIN_EMAIL = "ramaanindyaa@gmail.com";
const ADMIN_SALT = "my-links-admin:v1:";
const ADMIN_PASSWORD_SHA256_HEX =
  "4da0eea06cddba053bd82b8d895bbe50866300a41c268006cc5c806d05bf8051";
const ADMIN_SESSION_KEY = "adminSession:v1"; // stores password-hash, not password
const ADMIN_CRED_HASH_KEY = "adminCredHash:v1"; // stores current password-hash

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AdminPage() {
  const options = useMemo(() => kindOptions(), []);
  const [cfg, setCfg] = useState<LinkBioConfig>(() => defaultConfig());
  const [draft, setDraft] = useState<LinkBioConfig>(() => defaultConfig());
  const [status, setStatus] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string>("");
  const [authBusy, setAuthBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = window.localStorage;
    const fallback = readConfigFromStorage(storage);

    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load config");
        const serverConfig = sanitizeConfig((await response.json()) as unknown);
        if (!mounted) return;
        setCfg(serverConfig);
        setDraft(serverConfig);
        writeConfigToStorage(storage, serverConfig);
      } catch {
        if (!mounted) return;
        if (!storage.getItem("linkBioConfig:v1")) {
          writeConfigToStorage(storage, defaultConfig());
        }
        setCfg(fallback);
        setDraft(fallback);
      }
    };
    void load();

    const bc =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL) : null;
    return () => {
      mounted = false;
      bc?.close();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = window.localStorage;
    if (!storage.getItem(ADMIN_CRED_HASH_KEY)) {
      storage.setItem(ADMIN_CRED_HASH_KEY, ADMIN_PASSWORD_SHA256_HEX);
    }
    const sessionHash = storage.getItem(ADMIN_SESSION_KEY);
    const expectedHash = storage.getItem(ADMIN_CRED_HASH_KEY) ?? ADMIN_PASSWORD_SHA256_HEX;
    setAuthed(Boolean(sessionHash && sessionHash === expectedHash));
  }, []);

  const save = async (next: LinkBioConfig) => {
    if (typeof window === "undefined") return;
    setStatus("Saving...");
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Save failed");

      const saved = sanitizeConfig((await response.json()) as unknown);
      setCfg(saved);
      setDraft(saved);
      writeConfigToStorage(window.localStorage, saved);

      try {
        if (typeof BroadcastChannel !== "undefined") {
          new BroadcastChannel(SYNC_CHANNEL).postMessage({ type: "sync" });
        }
      } catch {
        // ignore
      }
      setStatus("Saved");
      window.setTimeout(() => setStatus(""), 1200);
    } catch {
      setStatus("Failed to save");
      window.setTimeout(() => setStatus(""), 1800);
    }
  };

  const saveDraft = () => {
    void save(draft);
  };

  const discardDraft = () => {
    setDraft(cfg);
    setStatus("Discarded");
    window.setTimeout(() => setStatus(""), 900);
  };

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(cfg);

  const login = async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      const normalized = email.trim().toLowerCase();
      if (normalized !== ADMIN_EMAIL) {
        setAuthError("Invalid email or password.");
        return;
      }
      const h = await sha256Hex(`${ADMIN_SALT}${password}`);
      const expected =
        window.localStorage.getItem(ADMIN_CRED_HASH_KEY) ?? ADMIN_PASSWORD_SHA256_HEX;
      if (h !== expected) {
        setAuthError("Invalid email or password.");
        return;
      }
      window.localStorage.setItem(ADMIN_SESSION_KEY, h);
      setPassword("");
      setAuthed(true);
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthed(false);
    setPassword("");
    setAuthError("");
    setEmail(ADMIN_EMAIL);
  };

  const changePassword = async () => {
    setPwStatus("");
    try {
      if (!pwNext || pwNext.length < 8) {
        setPwStatus("New password must be at least 8 characters.");
        return;
      }
      if (pwNext !== pwConfirm) {
        setPwStatus("New password and confirmation do not match.");
        return;
      }
      const currentHash = await sha256Hex(`${ADMIN_SALT}${pwCurrent}`);
      const expected =
        window.localStorage.getItem(ADMIN_CRED_HASH_KEY) ?? ADMIN_PASSWORD_SHA256_HEX;
      if (currentHash !== expected) {
        setPwStatus("Current password is incorrect.");
        return;
      }
      const nextHash = await sha256Hex(`${ADMIN_SALT}${pwNext}`);
      window.localStorage.setItem(ADMIN_CRED_HASH_KEY, nextHash);
      window.localStorage.setItem(ADMIN_SESSION_KEY, nextHash);
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
      setPwStatus("Password updated.");
      window.setTimeout(() => setPwStatus(""), 1500);
    } catch {
      setPwStatus("Failed to update password.");
    }
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    setDraft((d) => ({ ...d, profile: { ...d.profile, avatarDataUrl: dataUrl } }));
  };

  const updateLink = (id: string, patch: Partial<LinkItem>) => {
    setDraft((d) => ({
      ...d,
      links: d.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const removeLink = (id: string) => {
    setDraft((d) => {
      const nextLinks = d.links.filter((l) => l.id !== id);
      return { ...d, links: nextLinks.length ? nextLinks : defaultConfig().links };
    });
  };

  const moveLink = (id: string, dir: -1 | 1) => {
    const i = draft.links.findIndex((l) => l.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= draft.links.length) return;
    const next = [...draft.links];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    setDraft((d) => ({ ...d, links: next }));
  };

  const addLink = () => {
    const id = sanitizeId(`link-${draft.links.length + 1}`);
    setDraft((d) => ({
      ...d,
      links: [
        ...d.links,
        { id, title: "New link", url: "https://", subtitle: "", kind: "link" },
      ],
    }));
  };

  return (
    <div
      className="min-h-full w-full"
      style={{
        background:
          "radial-gradient(900px circle at 20% 12%, rgba(229,9,20,0.16), rgba(229,9,20,0) 55%), radial-gradient(700px circle at 90% 20%, rgba(255,255,255,0.06), rgba(255,255,255,0) 45%), linear-gradient(180deg, #0a0a0a 0%, #070707 100%)",
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <main className="mx-auto w-full max-w-[860px] px-5 pb-14 pt-10">
        {!authed ? (
          <section className="mx-auto mt-10 w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
              Admin login
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Login required to access dashboard.
            </p>

            <div className="mt-5 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-400">Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-zinc-400">Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void login();
                  }}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                />
              </label>
              {authError ? (
                <div className="text-sm text-red-300">{authError}</div>
              ) : null}
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void login()}
                className="mt-2 w-full rounded-xl bg-[#E50914] px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {authBusy ? "Signing in..." : "Sign in"}
              </button>
              <div className="pt-2 text-xs text-zinc-500">
                Note: This is client-side only (basic protection).
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Admin dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Edits are saved to server and synced to this browser cache. Open{" "}
              <Link className="text-zinc-200 underline underline-offset-4" href="/">
                /
              </Link>{" "}
              to preview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              {dirty ? "Unsaved changes" : status}
            </span>
            <button
              type="button"
              onClick={discardDraft}
              disabled={!dirty}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05] disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={!dirty}
              className="rounded-xl bg-[#E50914] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]"
            >
              Logout
            </button>
            <button
              type="button"
              onClick={() => setDraft(defaultConfig())}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]"
            >
              Reset defaults
            </button>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Profile picture</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-white/[0.03] ring-1 ring-white/10">
                {draft.profile.avatarDataUrl ? (
                  <img
                    src={draft.profile.avatarDataUrl}
                    alt={draft.profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.06] file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-white/[0.08]"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, avatarDataUrl: null },
                      }))
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.05]"
                  >
                    Remove avatar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Profile text</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <div className="text-xs font-medium text-zinc-400">Name</div>
                <input
                  value={draft.profile.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      profile: { ...d.profile, name: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-zinc-400">Bio</div>
                <textarea
                  value={draft.profile.bio}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      profile: { ...d.profile, bio: e.target.value },
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Security</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Change admin password (stored locally in this browser).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <div className="text-xs font-medium text-zinc-400">Current password</div>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-zinc-400">New password</div>
              <input
                type="password"
                value={pwNext}
                onChange={(e) => setPwNext(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-zinc-400">Confirm new password</div>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void changePassword();
                }}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-400">{pwStatus}</div>
            <button
              type="button"
              onClick={() => void changePassword()}
              className="rounded-xl bg-[#E50914] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Update password
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">Links</h2>
            <button
              type="button"
              onClick={addLink}
              className="rounded-xl bg-[#E50914] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Add link
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {draft.links.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-medium text-zinc-400">Title</div>
                      <input
                        value={link.title}
                        onChange={(e) => updateLink(link.id, { title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-zinc-400">Kind</div>
                      <select
                        value={link.kind}
                        onChange={(e) =>
                          updateLink(link.id, { kind: e.target.value as LinkKind })
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <div className="text-xs font-medium text-zinc-400">URL</div>
                      <input
                        value={link.url}
                        onChange={(e) => updateLink(link.id, { url: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <div className="text-xs font-medium text-zinc-400">Subtitle</div>
                      <input
                        value={link.subtitle}
                        onChange={(e) =>
                          updateLink(link.id, { subtitle: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-[#E50914]/60 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveLink(link.id, -1)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(link.id, 1)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.05]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
          </>
        )}
      </main>
    </div>
  );
}

