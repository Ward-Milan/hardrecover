export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 o";
  const k = 1024;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
}

export function formatSpeed(bps: number): string {
  if (!bps || bps <= 0) return "0.0 Mo/s";
  const mbps = bps / (1024 * 1024);
  if (mbps >= 1024) {
    return `${(mbps / 1024).toFixed(2)} Go/s`;
  }
  return `${mbps.toFixed(1)} Mo/s`;
}
