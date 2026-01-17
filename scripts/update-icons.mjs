import fs from "fs";
import path from "path";

const categoriesURL =
  "https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons";
const ACCEPT_HEADER = "application/vnd.github.raw+json";
const API_VERSION_HEADER = "2022-11-28";
const __dirname = import.meta.dirname;

/*
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons

  Response:  
  [
    {
      "name": "Weather",
      "path": "icons/Weather",
      "sha": "4b6373af1a78b9d39a9b82b6f9781427a2c0feb6",
      "size": 0,
      "url": "https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons/Weather?ref=master",
      "html_url": "https://github.com/Remix-Design/RemixIcon/tree/master/icons/Weather",
      "git_url": "https://api.github.com/repos/Remix-Design/RemixIcon/git/trees/4b6373af1a78b9d39a9b82b6f9781427a2c0feb6",
      "download_url": null,
      "type": "dir",
      "_links": {
        "self": "https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons/Weather?ref=master",
        "git": "https://api.github.com/repos/Remix-Design/RemixIcon/git/trees/4b6373af1a78b9d39a9b82b6f9781427a2c0feb6",
        "html": "https://github.com/Remix-Design/RemixIcon/tree/master/icons/Weather"
      }
    },
    ...
  ]
  */
async function fetchCategories() {
  console.log("Fetching categories...");
  try {
    const response = await fetch(categoriesURL, {
      headers: {
        Accept: ACCEPT_HEADER,
        "X-GitHub-Api-Version": API_VERSION_HEADER,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    const json = await response.json();
    return json.filter((category) => category.type === "dir");
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

/*
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons/Weather

  Response:  
  [
    {
      "name": "windy-line.svg",
      "path": "icons/Weather/windy-line.svg",
      "sha": "acd1edd2121e9f003a330a634ff7a8db1a478b98",
      "size": 851,
      "url": "https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons/Weather/windy-line.svg?ref=master",
      "html_url": "https://github.com/Remix-Design/RemixIcon/blob/master/icons/Weather/windy-line.svg",
      "git_url": "https://api.github.com/repos/Remix-Design/RemixIcon/git/blobs/acd1edd2121e9f003a330a634ff7a8db1a478b98",
      "download_url": "https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/icons/Weather/windy-line.svg",
      "type": "file",
      "_links": {
        "self": "https://api.github.com/repos/Remix-Design/RemixIcon/contents/icons/Weather/windy-line.svg?ref=master",
        "git": "https://api.github.com/repos/Remix-Design/RemixIcon/git/blobs/acd1edd2121e9f003a330a634ff7a8db1a478b98",
        "html": "https://github.com/Remix-Design/RemixIcon/blob/master/icons/Weather/windy-line.svg"
      }
    },
    ...
  ]
  */
async function fetchIcons(category) {
  console.log(`Fetching icons for category: ${category}`);
  try {
    const response = await fetch(`${categoriesURL}/${category}`, {
      headers: {
        Accept: ACCEPT_HEADER,
        "X-GitHub-Api-Version": API_VERSION_HEADER,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch icons: ${response.statusText}`);
    }
    const json = await response.json();
    return json.filter((icon) => icon.type === "file");
  } catch (error) {
    console.error(`Error fetching icons for category ${category}:`, error);
    throw error;
  }
}

async function downloadIcon(icon) {
  console.log(`Downloading icon: ${icon.path}`);
  try {
    const response = await fetch(icon.download_url);
    if (!response.ok) {
      throw new Error(`Failed to download icon: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(__dirname, "../assets", icon.path);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded icon: ${icon.path}`);
  } catch (error) {
    console.error(`Error downloading icon ${icon.path}:`, error);
    throw error;
  }
}

async function downloadIcons(icons) {
  const limit = 10;
  const queue = [...icons];
  const promises = [];

  while (queue.length > 0) {
    while (promises.length < limit && queue.length > 0) {
      const icon = queue.shift();
      promises.push(downloadIcon(icon).catch((error) => console.error(error)));
    }
    await Promise.all(promises);
    promises.length = 0; // Clear the array
  }
}

async function main() {
  const categories = await fetchCategories();
  const categoryNames = categories.map((category) => category.name);

  const categoriesAndIcons = {
    categories: categoryNames.map((category) => ({
      name: category,
      icons: [],
    })),
  };

  for (const category of categoryNames) {
    try {
      const icons = await fetchIcons(category);
      const iconData = icons.map((icon) => ({
        name: icon.name.replace(".svg", ""),
        path: icon.path,
        download_url: icon.download_url,
      }));
      categoriesAndIcons.categories.find((c) => c.name === category).icons =
        iconData;
      console.log(`Total icons for category ${category}: ${iconData.length}`);
      // await downloadIcons(iconData);
      console.log(`Downloaded all icons for category: ${category}`);
    } catch (error) {
      console.error(`Error fetching icons for category ${category}:`, error);
    }
  }

  const categoriesAndIconsJson = JSON.stringify(categoriesAndIcons, null, 2);
  fs.writeFileSync("./assets/catalogue.json", categoriesAndIconsJson);
  console.log("All icons successfully written to ./assets/catalogue.json");
}

main();
