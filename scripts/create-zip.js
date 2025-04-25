const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const pluginDir = path.resolve(__dirname, '../lr100-3d-viewer');
const outputZip = path.resolve(__dirname, '../lr100-3d-viewer.zip');

console.log('Creating WordPress plugin zip file...');

// Function to check if a directory exists
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

// Ensure the plugin directory exists
if (!directoryExists(pluginDir)) {
  console.error(`Error: Plugin directory ${pluginDir} not found!`);
  process.exit(1);
}

// Ensure the dist directory exists
const distDir = path.join(pluginDir, 'dist');
if (!directoryExists(distDir)) {
  console.error(`Error: Built files directory ${distDir} not found! Run 'npm run build' first.`);
  process.exit(1);
}

// Remove old zip if exists
if (fs.existsSync(outputZip)) {
  try {
    fs.unlinkSync(outputZip);
    console.log(`Removed existing zip file: ${outputZip}`);
  } catch (err) {
    console.error('Failed to delete existing zip file:', err);
  }
}

try {
  // Use powershell to create a zip file (works on Windows)
  console.log(`Creating zip file from: ${pluginDir}`);
  
  // This command uses PowerShell's Compress-Archive to create a zip file
  const powershellCommand = `powershell -Command "Compress-Archive -Path '${pluginDir}/*' -DestinationPath '${outputZip}' -Force"`;
  execSync(powershellCommand);
  
  console.log(`WordPress plugin zip file created successfully: ${outputZip}`);
} catch (error) {
  console.error('Error creating zip file:', error.message);
  process.exit(1);
}