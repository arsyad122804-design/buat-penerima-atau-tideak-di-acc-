const fs = require("fs");
const path = require("path");
const zip = require("bestzip");

// Ensure the app-dist directory exists
const distDir = path.join(__dirname, "app-dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const sourceFolder = "SchoolProcurement-win32-x64";
const cwd = path.join(__dirname, "dist", "build");
const zipPath = path.join(distDir, "SchoolProcurement-Windows.zip");

console.log(`Starting compression of ${sourceFolder} to ${zipPath}...`);

// Change directory context to dist/build to keep zip structure clean
process.chdir(cwd);

zip({
  source: sourceFolder,
  destination: zipPath
})
  .then(() => {
    console.log("Success! Desktop application has been packaged and zipped successfully.");
    console.log(`Destination: ${zipPath}`);
  })
  .catch((err) => {
    console.error("Zipping failed:", err);
    process.exit(1);
  });
