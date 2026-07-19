import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, "..");
const htmlPath = path.join(docsDir, "genetic-engine-full-guide.html");
const pdfPath = path.join(docsDir, "genetic-engine-full-guide.pdf");

async function generateWithPlaywright() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
  });
  await browser.close();
}

function generateWithEdge() {
  const candidates = [
    process.env["PROGRAMFILES(X86)"] + "\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.PROGRAMFILES + "\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const edge = candidates.find((p) => existsSync(p));
  if (!edge) {
    throw new Error("Microsoft Edge not found for headless PDF export.");
  }

  const result = spawnSync(
    edge,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`,
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0 || !existsSync(pdfPath)) {
    throw new Error("Edge headless PDF export failed.");
  }
}

try {
  await generateWithPlaywright();
} catch {
  generateWithEdge();
}

console.log(`PDF generated: ${pdfPath}`);
