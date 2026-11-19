import { cp, mkdir, rm, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
await mkdir("release", { recursive: true });
for (const browser of ["chrome", "edge"]) {
  const dest = `release/${browser}`;
  await rm(dest, { recursive: true, force: true });
  await cp("dist", dest, { recursive: true });
  await rm(`release/tabharbor-${browser}-${version}.zip`, { force: true });
  execFileSync("zip", ["-qr", `../tabharbor-${browser}-${version}.zip`, "."], {
    cwd: dest,
  });
}
console.log("Created Chrome and Edge build directories and ZIP packages.");
