import { Grid, Color } from "@raycast/api";
import { Category, RecentIcon } from "./types";
import IconActionPanel from "./IconActionPanel";
import { getSvgContent, svgToDataUri } from "./utils";

export default function CategorySection({
  category,
  updateRecentIcons,
}: Readonly<{
  category: Category;
  updateRecentIcons: (category: string, iconName: string) => void;
}>) {
  const isRecent = category.name === "Recent";
  
  return (
    <Grid.Section title={category.name} columns={8}>
      {category.icons.map((icon) => {
        // Handle both string (normal) and RecentIcon (Recent category) types
        const iconName = typeof icon === "string" ? icon : icon.name;
        const iconCategory = typeof icon === "string" ? category.name : icon.category;
        
        // Skip if category or name is missing
        if (!iconCategory || !iconName) {
          console.warn("Skipping icon with missing category or name:", icon);
          return null;
        }
        
        try {
          const svgContent = getSvgContent(iconCategory, iconName);
          const dataUri = svgToDataUri(svgContent);

          return (
            <Grid.Item
              key={`${iconCategory}-${iconName}`}
              title={iconName}
              content={{
                source: dataUri,
                tooltip: iconName,
                tintColor: Color.PrimaryText,
              }}
              actions={
                <IconActionPanel
                  category={iconCategory}
                  iconName={iconName}
                  updateRecentIcons={updateRecentIcons}
                />
              }
            />
          );
        } catch (error) {
          console.error(`Error loading icon ${iconCategory}/${iconName}:`, error);
          return null;
        }
      })}
    </Grid.Section>
  );
}
