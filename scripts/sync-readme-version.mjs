import { readFile, writeFile } from "node:fs/promises";

const VERSION_API_URL = "https://version.launchosapp.com";
const README_FILES = [
  "README.md",
  "README_CN.md",
  "README_TW.md",
  "README_JA.md",
];

const START_MARKER = "<!-- launchos-version:start -->";
const END_MARKER = "<!-- launchos-version:end -->";

async function fetchStableVersion() {
  const response = await fetch(VERSION_API_URL);

  if (!response.ok) {
    throw new Error(
      `Version API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const version = data?.stable?.version;
  const updateDate = data?.stable?.updateDate;

  if (!version) {
    throw new Error("Missing stable.version in version API response.");
  }

  if (!updateDate) {
    throw new Error("Missing stable.updateDate in version API response.");
  }

  return { version, updateDate };
}

function updateVersionBlock(content, filePath, versionLine) {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing launchos version markers in ${filePath}.`);
  }

  const lineStart = content.lastIndexOf("\n", startIndex) + 1;
  const indent = content.slice(lineStart, startIndex);
  const replacement = [
    `${indent}${START_MARKER}`,
    `${indent}${versionLine}`,
    `${indent}${END_MARKER}`,
  ].join("\n");

  return (
    content.slice(0, startIndex) +
    replacement +
    content.slice(endIndex + END_MARKER.length)
  );
}

async function syncReadmeVersion() {
  const { version, updateDate } = await fetchStableVersion();
  const versionLine = `<p>v${version} &nbsp; - &nbsp; ${updateDate}</p>`;
  let changedCount = 0;

  for (const filePath of README_FILES) {
    const content = await readFile(filePath, "utf8");
    const updatedContent = updateVersionBlock(content, filePath, versionLine);

    if (updatedContent !== content) {
      await writeFile(filePath, updatedContent);
      changedCount += 1;
      console.log(`Updated ${filePath} to v${version} (${updateDate}).`);
    } else {
      console.log(`${filePath} is already up to date.`);
    }
  }

  if (changedCount === 0) {
    console.log(`All README files are already on v${version} (${updateDate}).`);
  }
}

syncReadmeVersion().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
