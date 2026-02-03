import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveToAbsolute(targetPath) {
  if (!targetPath) {
    return null;
  }
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(__dirname, targetPath);
}

/**
 * Resolves the directory locations used by whatsapp-web.js to persist session data.
 * By default the data is stored in "<repo>/shared-whatsapp-session".
 * You can override the base paths with the environment variables:
 *   - WHATSAPP_SESSION_DIR
 *   - WHATSAPP_CACHE_DIR
 *
 * The caller can optionally supply a client key to get namespaced folders.
 */
export function getWhatsAppSessionPaths(clientKey = 'default', subdir) {
  const baseSessionDir =
    resolveToAbsolute(process.env.WHATSAPP_SESSION_DIR) ??
    path.join(__dirname, 'shared-whatsapp-session');

  const baseCacheDir =
    resolveToAbsolute(process.env.WHATSAPP_CACHE_DIR) ??
    path.join(baseSessionDir, '.cache');

  const sessionDir = path.join(baseSessionDir, ...(subdir ? [subdir] : []), clientKey);
  const cacheDir = path.join(baseCacheDir, ...(subdir ? [subdir] : []), clientKey);

  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  return { sessionDir, cacheDir };
}


