<?php
/*
Plugin Name: LR100 3D Viewer
Description: Integrates the LR100 3D visualization tool into WordPress
Version: 1.0
Author: Duncan Smith
*/

// Exit if accessed directly
if (!defined('ABSPATH')) exit;

class LR100_3D_Viewer {
    private static $instance = null;
    
    // Singleton pattern
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Register shortcode
        add_shortcode('lr100_3d', array($this, 'lr100_3d_shortcode'));
        
        // Register activation hook
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
    }
    
    public function activate_plugin() {
        // Make sure dist folder exists
        if (!file_exists(plugin_dir_path(__FILE__) . 'dist')) {
            wp_mkdir_p(plugin_dir_path(__FILE__) . 'dist');
        }
        
        if (!file_exists(plugin_dir_path(__FILE__) . 'dist/assets')) {
            wp_mkdir_p(plugin_dir_path(__FILE__) . 'dist/assets');
        }
    }
    
    public function lr100_3d_shortcode($atts) {
        // Extract attributes
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
            'include_controls' => 'true',
            'debug' => 'false' // Add debug parameter
        ), $atts);
        
        // Get assets URLs - ensure they're properly URL-encoded for direct inclusion
        $plugin_url = esc_url(plugin_dir_url(__FILE__));
        $assets_url = esc_url($plugin_url . 'dist/assets');
        
        // Create container with unique ID
        $container_id = 'lr100-container-' . uniqid();
        
        // Set debug mode based on parameter
        $debug_mode = ($atts['debug'] === 'true') ? 'true' : 'false';
        
        // Output container
        $output = '<div id="' . $container_id . '" class="lr100-container" style="width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';">';
        $output .= '<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; background-color: #f0f0f0;">';
        $output .= '<p>Loading LR100 3D Viewer...</p>';
        $output .= '</div>';
        $output .= '</div>';
        
        // If debug mode is enabled, show asset info
        if ($debug_mode === 'true') {
            $assets_dir = plugin_dir_path(__FILE__) . 'dist/assets';
            $output .= '<div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">';
            $output .= '<h3>Debug Information</h3>';
            $output .= '<p>Plugin URL: ' . $plugin_url . '</p>';
            $output .= '<p>Assets URL: ' . $assets_url . '</p>';
            
            if (is_dir($assets_dir)) {
                $files = scandir($assets_dir);
                $output .= '<p><strong>Files in assets directory:</strong></p><ul>';
                foreach ($files as $file) {
                    if ($file !== '.' && $file !== '..') {
                        $output .= '<li>' . $file . '</li>';
                    }
                }
                $output .= '</ul>';
            } else {
                $output .= '<p style="color: red;">Assets directory not found: ' . $assets_dir . '</p>';
            }
            $output .= '</div>';
        }
        
        // Create a separate script tag to avoid WordPress messing with your code
        $output .= <<<SCRIPT
<script>
(function() {
    document.addEventListener("DOMContentLoaded", function() {
        const container = document.getElementById("{$container_id}");
        const assetsUrl = "{$assets_url}";
        const pluginUrl = "{$plugin_url}";
        const DEBUG = {$debug_mode};
        
        // Helper to get asset URL
        function getAssetUrl(fileName) {
            if (!fileName) return '';
            // Remove any path information, just get the filename
            const baseName = fileName.split('/').pop();
            return assetsUrl + '/' + baseName;
        }
        
        // Debug function
        function debug(message, ...args) {
            console.log(`LR100: ${message}`, ...args);
        }
        
        debug('Initializing LR100 3D Viewer');
        debug('Assets URL:', assetsUrl);
        debug('Plugin URL:', pluginUrl);
        
        // Add CSS file
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = assetsUrl + "/index-Ds3WH6D6.css";
        document.head.appendChild(cssLink);
        debug('Added CSS link:', cssLink.href);
        
        // ----- THIS IS THE AGGRESSIVE PATCHING SECTION -----
        
        // 1. Override full file paths by filename
        window.ASSET_FILES = {
            '100-10-MOVING.gltf': assetsUrl + '/100-10-MOVING.gltf',
            '100-10-STAND.gltf': assetsUrl + '/100-10-STAND.gltf',
            '100-99-MOVING.gltf': assetsUrl + '/100-99-MOVING.gltf',
            '100-99-STAND.gltf': assetsUrl + '/100-99-STAND.gltf',
            '100-200-MOVING.gltf': assetsUrl + '/100-200-MOVING.gltf',
            '100-200-STAND.gltf': assetsUrl + '/100-200-STAND.gltf',
            '1410.gltf': assetsUrl + '/1410.gltf',
            '1410C.gltf': assetsUrl + '/1410C.gltf',
            '1410model.gltf': assetsUrl + '/1410model.gltf',
            '284-SPOOL.gltf': assetsUrl + '/284-SPOOL.gltf',
            'bench.gltf': assetsUrl + '/bench.gltf',
            'LR100-284.gltf': assetsUrl + '/LR100-284.gltf',
            'table.gltf': assetsUrl + '/table.gltf',
            'toolbox.gltf': assetsUrl + '/toolbox.gltf',
            'taymer_logo.png': assetsUrl + '/taymer_logo.png',
            'taymer_small_logo.jpeg': assetsUrl + '/taymer_small_logo.jpeg',
            'Rope002.png': assetsUrl + '/Rope002.png',
            'Rope002_1K-JPG_Color.jpg': assetsUrl + '/Rope002_1K-JPG_Color.jpg',
            'Rope002_1K-JPG_Displacement.jpg': assetsUrl + '/Rope002_1K-JPG_Displacement.jpg',
            'Rope002_1K-JPG_Metalness.jpg': assetsUrl + '/Rope002_1K-JPG_Metalness.jpg',
            'Rope002_1K-JPG_NormalDX.jpg': assetsUrl + '/Rope002_1K-JPG_NormalDX.jpg',
            'Rope002_1K-JPG_NormalGL.jpg': assetsUrl + '/Rope002_1K-JPG_NormalGL.jpg',
            'Rope002_1K-JPG_Roughness.jpg': assetsUrl + '/Rope002_1K-JPG_Roughness.jpg'
        };
        
        // 2. Override fetch API to intercept ALL requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                // Extract the filename from the URL
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                
                // Check if this is one of our asset files
                if (window.ASSET_FILES[fileName]) {
                    debug('Fixing fetch URL for ' + fileName + ':', url, '->', window.ASSET_FILES[fileName]);
                    return originalFetch(window.ASSET_FILES[fileName], options);
                }
                
                // Handle specific patterns we've seen
                if (url.includes('/length-measurement-configurator/assets/')) {
                    const fileNameFromPath = url.split('/assets/').pop();
                    const correctedUrl = assetsUrl + '/' + fileNameFromPath;
                    debug('Fixing fetch URL with length-measurement pattern:', url, '->', correctedUrl);
                    return originalFetch(correctedUrl, options);
                }
                
                if (url.startsWith('/assets/') || url.startsWith('./assets/')) {
                    const fileNameFromPath = url.split('/assets/').pop();
                    const correctedUrl = assetsUrl + '/' + fileNameFromPath;
                    debug('Fixing fetch URL with assets pattern:', url, '->', correctedUrl);
                    return originalFetch(correctedUrl, options);
                }
            }
            return originalFetch(url, options);
        };
        
        // 3. Override ALL instance of loader.load functions once THREE is available
        const patchLoaders = setInterval(() => {
            if (window.THREE) {
                clearInterval(patchLoaders);
                debug('THREE.js detected, patching loaders');
                
                // Intercept GLTFLoader
                if (THREE.GLTFLoader) {
                    const originalGLTFLoader = THREE.GLTFLoader;
                    THREE.GLTFLoader = function(...args) {
                        const loader = new originalGLTFLoader(...args);
                        const originalLoad = loader.load;
                        
                        loader.load = function(url, onLoad, onProgress, onError) {
                            let newUrl = url;
                            
                            // Check if it's a string URL
                            if (typeof url === 'string') {
                                // Extract the filename
                                const urlParts = url.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                
                                // Check our mapping first
                                if (window.ASSET_FILES[fileName]) {
                                    newUrl = window.ASSET_FILES[fileName];
                                    debug('Fixed GLTFLoader URL by filename:', fileName, newUrl);
                                } 
                                // Check path patterns
                                else if (url.includes('/assets/')) {
                                    const fileNameFromPath = url.split('/assets/').pop();
                                    newUrl = assetsUrl + '/' + fileNameFromPath;
                                    debug('Fixed GLTFLoader URL by path pattern:', url, '->', newUrl);
                                }
                            }
                            
                            debug('Loading model from:', newUrl);
                            return originalLoad.call(loader, newUrl, onLoad, onProgress, function(error) {
                                console.error('Error loading model:', newUrl, error);
                                if (onError) onError(error);
                            });
                        };
                        
                        return loader;
                    };
                    
                    debug('Patched GLTFLoader');
                }
                
                // Intercept TextureLoader
                if (THREE.TextureLoader) {
                    const originalTextureLoader = THREE.TextureLoader;
                    THREE.TextureLoader = function(...args) {
                        const loader = new originalTextureLoader(...args);
                        const originalLoad = loader.load;
                        
                        loader.load = function(url, onLoad, onProgress, onError) {
                            let newUrl = url;
                            
                            // Check if it's a string URL
                            if (typeof url === 'string') {
                                // Extract the filename
                                const urlParts = url.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                
                                // Check our mapping first
                                if (window.ASSET_FILES[fileName]) {
                                    newUrl = window.ASSET_FILES[fileName];
                                    debug('Fixed TextureLoader URL by filename:', fileName, newUrl);
                                } 
                                // Check path patterns
                                else if (url.includes('/assets/')) {
                                    const fileNameFromPath = url.split('/assets/').pop();
                                    newUrl = assetsUrl + '/' + fileNameFromPath;
                                    debug('Fixed TextureLoader URL by path pattern:', url, '->', newUrl);
                                }
                            }
                            
                            return originalLoad.call(loader, newUrl, onLoad, onProgress, onError);
                        };
                        
                        return loader;
                    };
                    
                    debug('Patched TextureLoader');
                }
            }
        }, 100);
        
        // 4. Create a global hook for ANY method that loads assets
        function patchAssetLoaderFunctions() {
            debug('Setting up asset loader patches');
            
            // Fix loadCombo function
            window.originalLoadCombo = window.loadCombo;
            window.loadCombo = function(fileName, onLoad) {
                if (!fileName) return;
                debug('loadCombo called with:', fileName);
                
                // Always use the correct assets URL
                const correctPath = getAssetUrl(fileName);
                debug('Using path:', correctPath);
                
                if (window.loader && window.loader.load) {
                    debug('Loading model via loader.load:', correctPath);
                    window.loader.load(
                        correctPath,
                        function(gltf) {
                            debug('Model loaded successfully:', fileName);
                            if (onLoad) onLoad(gltf.scene);
                        },
                        function(progress) {
                            // Optional progress
                        },
                        function(error) {
                            console.error('Error loading model:', fileName, error);
                        }
                    );
                } else {
                    console.error('loader not available yet');
                }
            };
            
            // Fix loadSpoolFromMovingAssets function if it exists
            if (window.loadSpoolFromMovingAssets) {
                const originalLoadSpool = window.loadSpoolFromMovingAssets;
                window.loadSpoolFromMovingAssets = function() {
                    debug('Patched loadSpoolFromMovingAssets called');
                    
                    // The original function likely does: loader.load(\`./assets/284-SPOOL.gltf\`, ...)
                    if (window.loader && window.loader.load) {
                        const correctPath = getAssetUrl('284-SPOOL.gltf');
                        debug('Loading spool with correct path:', correctPath);
                        
                        if (window.spoolModel) {
                            window.disposeModel(window.spoolModel);
                            window.spoolModel = null;
                        }
                        
                        window.loader.load(
                            correctPath,
                            function(gltf) {
                                debug('Spool model loaded successfully');
                                window.spoolModel = gltf.scene;
                                window.spoolModel.position.set(-0.55, 0.16, 0.035);
                                window.spoolModel.scale.set(11, 11, 11);
                                window.scene.add(window.spoolModel);
                                if (window.createFloorCoil) {
                                    window.createFloorCoil();
                                }
                            },
                            undefined,
                            function(error) {
                                console.error('Error loading spool model:', error);
                            }
                        );
                        return; // Skip original function
                    }
                    
                    // If we can't patch it, call the original function
                    originalLoadSpool();
                };
            }
            
            // This is a significant hack, but necessary to fix all loading issues:
            // Monitor calls to loader.load and intercept them
            const monitorInterval = setInterval(() => {
                if (window.loader && window.loader.load && !window.loader.__patched) {
                    const originalLoaderLoad = window.loader.load;
                    window.loader.__patched = true;
                    
                    window.loader.load = function(url, onLoad, onProgress, onError) {
                        let newUrl = url;
                        
                        // Check if it's a string URL
                        if (typeof url === 'string') {
                            // Extract the filename
                            const urlParts = url.split('/');
                            const fileName = urlParts[urlParts.length - 1];
                            
                            // Check our mapping first
                            if (window.ASSET_FILES[fileName]) {
                                newUrl = window.ASSET_FILES[fileName];
                                debug('Fixed loader.load URL by filename:', fileName, newUrl);
                            } 
                            // Check path patterns
                            else if (url.includes('/assets/')) {
                                const fileNameFromPath = url.split('/assets/').pop();
                                newUrl = assetsUrl + '/' + fileNameFromPath;
                                debug('Fixed loader.load URL by path pattern:', url, '->', newUrl);
                            }
                        }
                        
                        debug('Loading with patched loader:', newUrl);
                        return originalLoaderLoad.call(window.loader, newUrl, onLoad, onProgress, function(error) {
                            console.error('Error in patched loader.load:', newUrl, error);
                            if (onError) onError(error);
                        });
                    };
                    
                    debug('Patched window.loader.load method');
                    clearInterval(monitorInterval);
                }
            }, 100);
        }
        
        // Create HTML structure
        container.innerHTML = `
SCRIPT;

        // Add controls if requested
        if ($atts['include_controls'] === 'true') {
            $output .= <<<HTML
<div id="top-bar">
    <div class="panel-title">LR100 Configuration</div>
    <label for="coilerSelect">Coiler:</label>
    <select id="coilerSelect">
        <option value="">-- Select Coiler --</option>
        <option value="100-10.gltf" id="100-10">Collapsible 16″ I.D. Coiler</option>
        <option value="100-99.gltf" id="100-99">Collapsible 12″ I.D. Coiler</option>
        <option value="100-200.gltf" id="100-200">Collapsible 8″ I.D. Coiler</option>
    </select>
    <label for="reelStandSelect">Reel Stand:</label>
    <select id="reelStandSelect">
        <option value="">-- Select Reel Stand --</option>
        <option value="LR100-284.gltf" id="100-284">Wind-off Reel Stand</option>
    </select>
    <label for="counterSelect">Counter:</label>
    <select id="counterSelect">
        <option value="">-- Select Counter --</option>
        <option value="1410.gltf" id="1410">Footage Counter</option>
        <option value="1410.gltf" id="1420">Metric Counter</option>
        <option value="1410.gltf" id="1410UR">Footage Counter with UR Wheels</option>
        <option value="1410.gltf" id="1420UR">Metric Counter with UR Wheels</option>
    </select>
    <label for="cutterSelect">Cutter:</label>
    <select id="cutterSelect" disabled>
        <option value="">-- Select Cutter --</option>
        <option value="1410C.gltf" id="100-C">Cutting Blade</option>
    </select>
    <button class="add-to-cart" id="addBtn">Add to cart</button>
    <div id="price-display"></div>
</div>
<div class="footer-text footer-left">
    Note: LR100-284 does not include a spool, colours are subject to change
</div>
<div class="footer-text footer-right">
    © 2025 Taymer International, Inc. All rights reserved.
</div>
HTML;
        }
        
        // Add canvas and continuation of JavaScript
        $output .= <<<HTML
<div id="top-overlay" style="position: fixed; z-index: 10000; top: 0; left: 0; width: 100%; pointer-events: none;"></div>
<div id="canvas-container">
    <div id="canvas-overlay">
        <p>Click and Drag to Rotate</p>
    </div>
    <canvas id="lr100-canvas"></canvas>
</div>`;

        // Call our patching functions
        patchAssetLoaderFunctions();
        
        // Fix Worker loading
        const originalWorker = window.Worker;
        window.Worker = function(url, options) {
            if (url instanceof URL) {
                const urlString = url.toString();
                if (urlString.includes('physicsWorker')) {
                    const workerUrl = assetsUrl + "/physicsWorker-iiFlsN1r.js";
                    debug('Fixed Worker URL:', urlString, '->', workerUrl);
                    return new originalWorker(workerUrl, options);
                }
            }
            return new originalWorker(url, options);
        };
        
        // Load the main script
        const script = document.createElement('script');
        script.type = 'module';
        script.src = assetsUrl + '/index-Da-JLo9O.js';
        script.onload = function() {
            debug('Main script loaded successfully');
        };
        script.onerror = function(error) {
            console.error('Failed to load main script:', error);
            container.innerHTML = '<div style="color: red; padding: 20px;">Error loading 3D viewer. Please check the console for details.</div>';
        };
        document.body.appendChild(script);
    });
})();
</script>
HTML;
        
        return $output;
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');

