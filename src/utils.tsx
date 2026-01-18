import path from "node:path";
import fs from "node:fs";
import { environment } from "@raycast/api";

export function toUpperCamelCase(string: string) {
  const camelCaseString = string.replaceAll(/[-_]\w/gi, (match) =>
    match[1].toUpperCase(),
  );

  return camelCaseString.charAt(0).toUpperCase() + camelCaseString.slice(1);
}

// Cache for compressed icon files
const svgCache: Record<string, Record<string, string>> = {};

export function getSvgContent(category: string, iconName: string): string {
  // Load category file if not cached
  if (!svgCache[category]) {
    const compressedPath = path.join(
      environment.assetsPath,
      `icons-compressed/${category}.json`
    );
    svgCache[category] = JSON.parse(fs.readFileSync(compressedPath, "utf-8"));
  }

  return svgCache[category][iconName] || "";
}

export function svgToDataUri(svgContent: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;
}

