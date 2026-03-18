import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultConfig, sanitizeConfig, type LinkBioConfig } from "@/lib/linkBioConfig";

export const runtime = "nodejs";

const CONFIG_ROOT = process.env.VERCEL ? "/tmp" : process.cwd();
const CONFIG_FILE = path.join(CONFIG_ROOT, "data", "linkBioConfig.json");

async function ensureConfigFile() {
  await mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  try {
    await readFile(CONFIG_FILE, "utf8");
  } catch {
    await writeFile(CONFIG_FILE, JSON.stringify(defaultConfig(), null, 2), "utf8");
  }
}

async function readStoredConfig(): Promise<LinkBioConfig> {
  await ensureConfigFile();
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeConfig(parsed);
  } catch {
    return defaultConfig();
  }
}

async function writeStoredConfig(input: unknown): Promise<LinkBioConfig> {
  await ensureConfigFile();
  const next = sanitizeConfig(input);
  await writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function GET() {
  const cfg = await readStoredConfig();
  return Response.json(cfg, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const saved = await writeStoredConfig(body);
    return Response.json(saved, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    return Response.json(
      {
        error: "Failed to persist config on server",
      },
      { status: 500 },
    );
  }
}
