export type LinkKind = "portfolio" | "github" | "twitter" | "youtube" | "email" | "link";

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  subtitle: string;
  kind: LinkKind;
};

export type Profile = {
  name: string;
  bio: string;
  avatarDataUrl?: string | null;
};

export type LinkBioConfig = {
  profile: Profile;
  links: LinkItem[];
};

export const CONFIG_STORAGE_KEY = "linkBioConfig:v1";
export const CLICKS_STORAGE_KEY = "linkClicks:v1";
export const SYNC_CHANNEL = "linkBioSync:v1";

export function defaultConfig(): LinkBioConfig {
  return {
    profile: {
      name: "Rama Anindya",
      bio: "Vibe Coder ✨ | Building cool stuff with AI",
      avatarDataUrl: null,
    },
    links: [
      {
        id: "portfolio",
        title: "Portfolio",
        url: "https://rama-anindya.com",
        subtitle: "Selected work & experiments",
        kind: "portfolio",
      },
      {
        id: "github",
        title: "GitHub",
        url: "https://github.com/",
        subtitle: "Code, projects, and repos",
        kind: "github",
      },
      {
        id: "twitter",
        title: "Twitter",
        url: "https://twitter.com/",
        subtitle: "Hot takes & build logs",
        kind: "twitter",
      },
      {
        id: "youtube",
        title: "YouTube",
        url: "https://youtube.com/",
        subtitle: "Tutorials & demos",
        kind: "youtube",
      },
      {
        id: "email",
        title: "Email",
        url: "mailto:ramaanindyaa@gmail.com",
        subtitle: "Let’s collaborate",
        kind: "email",
      },
    ],
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function asString(x: unknown, fallback: string) {
  return typeof x === "string" ? x : fallback;
}

function asNullableString(x: unknown) {
  if (x === null || x === undefined) return null;
  return typeof x === "string" ? x : null;
}

function asKind(x: unknown): LinkKind {
  switch (x) {
    case "portfolio":
    case "github":
    case "twitter":
    case "youtube":
    case "email":
    case "link":
      return x;
    default:
      return "link";
  }
}

function sanitizeId(id: string) {
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return cleaned || `link-${Math.random().toString(16).slice(2)}`;
}

export function sanitizeConfig(input: unknown, fallback: LinkBioConfig = defaultConfig()): LinkBioConfig {
  if (!isRecord(input)) return fallback;

  const profileRaw = input.profile;
  const profile: Profile = {
    name: fallback.profile.name,
    bio: fallback.profile.bio,
    avatarDataUrl: null,
  };
  if (isRecord(profileRaw)) {
    profile.name = asString(profileRaw.name, fallback.profile.name);
    profile.bio = asString(profileRaw.bio, fallback.profile.bio);
    profile.avatarDataUrl = asNullableString(profileRaw.avatarDataUrl);
  }

  const linksRaw = input.links;
  const links: LinkItem[] = [];
  if (Array.isArray(linksRaw)) {
    for (const item of linksRaw) {
      if (!isRecord(item)) continue;
      const id = sanitizeId(asString(item.id, ""));
      links.push({
        id,
        title: asString(item.title, id),
        url: asString(item.url, ""),
        subtitle: asString(item.subtitle, ""),
        kind: asKind(item.kind),
      });
    }
  }

  const deduped: LinkItem[] = [];
  const seen = new Set<string>();
  for (const link of links.length ? links : fallback.links) {
    const id = sanitizeId(link.id);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push({ ...link, id });
  }

  return { profile, links: deduped };
}

export function readConfigFromStorage(storage: Storage | undefined): LinkBioConfig {
  const fallback = defaultConfig();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeConfig(parsed, fallback);
  } catch {
    return fallback;
  }
}

export function writeConfigToStorage(storage: Storage | undefined, cfg: LinkBioConfig) {
  if (!storage) return;
  storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
}

