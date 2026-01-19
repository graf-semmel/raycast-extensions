import { ActionPanel, Action, Icon, Clipboard, showHUD } from "@raycast/api";
import { getSvgContent, svgToDataUri, toUpperCamelCase } from "./utils";

export default function IconActionPanel({
  category,
  iconName,
  updateRecentIcons,
}: Readonly<{
  category: string;
  iconName: string;
  updateRecentIcons: (category: string, iconName: string) => void;
}>) {
  const handleCopy = async (format: string, getContent: () => string) => {
    try {
      const content = getContent();
      await Clipboard.copy(content);
      await showHUD(`📋 Copied "${iconName}" (${format}) to your clipboard.`);
      updateRecentIcons(category, iconName);
    } catch (error) {
      console.error(`Error copying ${format}:`, error);
      await showHUD(`❌ Could not copy the ${format}.`);
    }
  };

  const copySVG = () =>
    handleCopy("SVG", () => getSvgContent(category, iconName));

  const copyWebfont = () =>
    handleCopy("Webfont", () => `<i class="ri-${iconName}"></i>`);

  const copyCDN = async () => {
    try {
      const metadata = await import("../assets/metadata.json");
      const version = metadata.version || "4.8.0";
      const cdnLink = `<link href="https://cdn.jsdelivr.net/npm/remixicon@${version}/fonts/remixicon.css" rel="stylesheet"/>`;
      await Clipboard.copy(cdnLink);
      await showHUD(`📋 Copied CDN link (v${version}) to your clipboard.`);
      updateRecentIcons(category, iconName);
    } catch (error) {
      console.error("Error copying CDN:", error);
      await showHUD("❌ Could not copy the CDN link.");
    }
  };

  const copyDataURI = () =>
    handleCopy("Data URI", () => {
      const content = getSvgContent(category, iconName);
      return svgToDataUri(content);
    });

  const copyReactComponent = () => {
    const componentName = "Ri" + toUpperCamelCase(iconName);
    return handleCopy(
      "React Component",
      () => `<${componentName} size={24} color="currentColor" />`,
    );
  };

  return (
    <ActionPanel>
      <Action title="Copy SVG" onAction={copySVG} icon={Icon.CopyClipboard} />
      <Action
        title="Copy Webfont"
        onAction={copyWebfont}
        icon={Icon.CopyClipboard}
      />
      <Action
        title="Copy CDN Link"
        onAction={copyCDN}
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action
        title="Copy Data URI"
        onAction={copyDataURI}
        icon={Icon.CopyClipboard}
      />
      <Action
        title="Copy React Component"
        onAction={copyReactComponent}
        icon={Icon.Code}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action.OpenInBrowser
        title="Remix Icon Homepage"
        url="https://remixicon.com/"
      />
      <Action.OpenInBrowser
        title="Remix Icon GitHub Page"
        url="https://github.com/Remix-Design/RemixIcon"
      />
      {/* <Action
        title="Copy SVG Sprite"
        onAction={() => {
          try {
            const spriteElement = `<svg class="remix"><use xlink:href="your-path/remixicon.symbol.svg#${icon.name}"></use></svg>`;
            Clipboard.copy(spriteElement);
            showHUD(`📋 Copied "${icon.name}" (SVG Sprite) to your clipboard.`);
            updateRecentIcons(icon);
          } catch (error) {
            showHUD("❌ Could not copy the SVG Sprite.");
          }
        }}
        icon={Icon.Link}
      /> */}
      {/* TODO - Make "your-path" a preference */}
      {/* TODO - Make size, color, className a preference */}
    </ActionPanel>
  );
}
