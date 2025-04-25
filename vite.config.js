import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Get the absolute path to the plugin directory
const pluginDistPath = resolve(__dirname, 'lr100-3d-viewer/dist');
const pluginAssetsPath = resolve(__dirname, 'lr100-3d-viewer/dist/assets');

// Create directories if they don't exist
if (!fs.existsSync(pluginDistPath)) {
  fs.mkdirSync(pluginDistPath, { recursive: true });
}
if (!fs.existsSync(pluginAssetsPath)) {
  fs.mkdirSync(pluginAssetsPath, { recursive: true });
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'lr100-3d-viewer/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/scripts/js/main.js'),
        physicsWorker: resolve(__dirname, 'src/scripts/js/physicsWorker.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    sourcemap: false,
    minify: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    // Custom plugin to copy assets after build
    {
      name: 'copy-assets',
      closeBundle: async () => {
        console.log('Copying assets to plugin directory...');
        
        // Create assets directory if it doesn't exist
        if (!fs.existsSync(pluginAssetsPath)) {
          fs.mkdirSync(pluginAssetsPath, { recursive: true });
        }
        
        // Copy all assets from src/assets to the plugin assets directory
        const srcAssetsPath = resolve(__dirname, 'src/assets');
        if (fs.existsSync(srcAssetsPath)) {
          const files = fs.readdirSync(srcAssetsPath);
          for (const file of files) {
            const srcPath = resolve(srcAssetsPath, file);
            const destPath = resolve(pluginAssetsPath, file);
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied: ${file}`);
          }
        }
      }
    }
  ]
});