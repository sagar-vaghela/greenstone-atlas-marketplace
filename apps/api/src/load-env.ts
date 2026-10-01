import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRootEnv = resolve(appDir, "../../../.env");
const apiEnv = resolve(appDir, "../.env");

loadEnv({ path: repoRootEnv, override: true });
loadEnv({ path: apiEnv, override: true });
