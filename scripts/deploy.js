const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Preparing to deploy WordPress plugin...');

// First run the zip creation script
try {
  require('./create-zip');
} catch (error) {
  console.error('Failed to create zip file:', error);
  process.exit(1);
}

console.log('\n===== DEPLOYMENT INSTRUCTIONS =====');
console.log('1. Log in to your WordPress admin dashboard');
console.log('2. Navigate to Plugins > Add New > Upload Plugin');
console.log('3. Choose the file: lr100-3d-viewer.zip from your project root');
console.log('4. Click "Install Now"');
console.log('5. After installation, click "Activate Plugin"');
console.log('\nIf the plugin is already installed:');
console.log('1. Deactivate the existing plugin first');
console.log('2. Delete the existing plugin');
console.log('3. Follow the steps above to install the new version');
console.log('\n===================================');