import { ActionPanel, Action, Icon, Clipboard, showHUD } from "@raycast/api";
import { getSvgContent, svgToDataUri } from "./utils";

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
    handleCopy("Webfont", () => `<i class="${iconName}"></i>`);

  const copyDataURI = () =>
    handleCopy("Data URI", () => {
      const content = getSvgContent(category, iconName);
      return svgToDataUri(content);
    });

  return (
    <ActionPanel>
      <Action title="Copy SVG" onAction={copySVG} icon={Icon.CopyClipboard} />
      <Action
        title="Copy Webfont"
        onAction={copyWebfont}
        icon={Icon.CopyClipboard}
      />
      <Action
        title="Copy Data URI"
        onAction={copyDataURI}
        icon={Icon.CopyClipboard}
      />
      <Action.OpenInBrowser
        title="Remix Icon Homepage"
        url="https://remixicon.com/"
      />
      <Action.OpenInBrowser
        title="Remix Icon GitHub Page"
        url="https://github.com/Remix-Design/RemixIcon"
      />
      {/* TODO - Make "your-path" a preference */}
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

      {/* TODO - Make size, color, className a preference */}
      {/* <Action
        title="Copy React Component"
        onAction={() => {
          const componentName = toUpperCamelCase(icon.name);
          const component = `<${componentName} size={24} color="black" className="my-class"/>`;
          Clipboard.copy(component);
          showHUD(
            `📋 Copied "${icon.name}" (React Component) to your clipboard.`,
          );
        }}
        icon={Icon.Code}
      /> */}
    </ActionPanel>
  );
}
