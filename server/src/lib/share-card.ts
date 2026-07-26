/**
 * Renders a branded, shareable PNG from structured data via Canvas 2D - not
 * a DOM screenshot. Screenshotting the live cards would drag in backdrop
 * blur/gradient rendering quirks across browsers; drawing a fixed layout
 * from the underlying numbers is simpler and always looks the same.
 */
export interface ShareCardOptions {
  emoji: string;
  title: string;
  subtitle?: string;
  stat?: { label: string; value: string };
  lines: { label: string; value: string }[];
  footer?: string;
}

const WIDTH = 1080;
const HEIGHT = 1080;
const FONT = "'Segoe UI', system-ui, sans-serif";

export async function generateShareCard(options: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported in this browser.");

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#fffcf5");
  bg.addColorStop(1, "#f0dfc0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);

  ctx.textAlign = "center";
  ctx.fillStyle = "#9a3412";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("✨ ADI JYOTISH GURUS", WIDTH / 2, 110);

  ctx.font = "110px sans-serif";
  ctx.fillText(options.emoji, WIDTH / 2, 260);

  ctx.fillStyle = "#2a1b12";
  ctx.font = `700 54px ${FONT}`;
  ctx.fillText(options.title, WIDTH / 2, 340);

  let y = 340;
  if (options.subtitle) {
    ctx.fillStyle = "#8a6f5c";
    ctx.font = `400 28px ${FONT}`;
    ctx.fillText(options.subtitle, WIDTH / 2, y + 46);
    y += 46;
  }

  if (options.stat) {
    ctx.fillStyle = "#ea580c";
    ctx.font = `800 150px ${FONT}`;
    ctx.fillText(options.stat.value, WIDTH / 2, y + 220);
    ctx.fillStyle = "#8a6f5c";
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(options.stat.label.toUpperCase(), WIDTH / 2, y + 265);
    y += 300;
  } else {
    y += 60;
  }

  ctx.textAlign = "left";
  const lineX = 140;
  let lineY = y + 50;
  for (const line of options.lines) {
    ctx.fillStyle = "#8a6f5c";
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(line.label.toUpperCase(), lineX, lineY);
    ctx.fillStyle = "#2a1b12";
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(line.value, lineX, lineY + 38);
    lineY += 84;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8a6f5c";
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(options.footer ?? "adijyotishgurus.com", WIDTH / 2, HEIGHT - 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render image."));
    }, "image/png");
  });
}

/** Uses the native share sheet when available (mobile), falls back to a direct download. */
export async function shareOrDownloadImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
