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
            'include_controls' => 'true'
        ), $atts);
        
        // Get assets URLs - ensure they're properly URL-encoded for direct inclusion
        $plugin_url = esc_url(plugin_dir_url(__FILE__));
        $assets_url = esc_url($plugin_url . 'dist/assets');
        
        // Create container with unique ID
        $container_id = 'lr100-container-' . uniqid();
        
        // Output container
        $output = '<div id="' . $container_id . '" class="lr100-container" style="width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';">';
        $output .= '<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; background-color: #f0f0f0;">';
        $output .= '<p>Loading LR100 3D Viewer...</p>';
        $output .= '</div>';
        $output .= '</div>';
        
        // Create a separate script tag to avoid WordPress messing with your code
        $output .= <<<SCRIPT
<script>
(function() {
    document.addEventListener("DOMContentLoaded", function() {
        const container = document.getElementById("{$container_id}");
        const assetsUrl = "{$assets_url}";
        const pluginUrl = "{$plugin_url}";
        
        // Add CSS file
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = assetsUrl + "/index-Ds3WH6D6.css";
        document.head.appendChild(cssLink);
        
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

        // Fix all asset paths by intercepting network requests
        
        // 1. Fix fetch requests to various patterns
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                // Fix absolute /assets/ paths
                if (url.startsWith('/assets/')) {
                    console.log('LR100: Fixing fetch absolute path', url, '->', assetsUrl + url.substring(7));
                    return originalFetch(assetsUrl + url.substring(7), options);
                }
                
                // Fix hardcoded paths to length-measurement-configurator/assets/ (seen in your error)
                if (url.includes('/length-measurement-configurator/assets/')) {
                    const assetName = url.split('/assets/').pop();
                    console.log('LR100: Fixing fetch hardcoded path', url, '->', assetsUrl + '/' + assetName);
                    return originalFetch(assetsUrl + '/' + assetName, options);
                }
                
                // Fix relative paths to ./assets/
                if (url.startsWith('./assets/')) {
                    console.log('LR100: Fixing fetch relative path', url, '->', assetsUrl + url.substring(8));
                    return originalFetch(assetsUrl + url.substring(8), options);
                }
                
                // Fix other hardcoded paths that end with model filenames
                const modelFiles = [
                    '100-10-MOVING.gltf', '100-10-STAND.gltf', 
                    '100-99-MOVING.gltf', '100-99-STAND.gltf',
                    '100-200-MOVING.gltf', '100-200-STAND.gltf',
                    '1410.gltf', '1410C.gltf', '1410model.gltf',
                    '284-SPOOL.gltf', 'LR100-284.gltf'
                ];
                
                for (const file of modelFiles) {
                    if (url.endsWith(file)) {
                        console.log('LR100: Fixing fetch model path', url, '->', assetsUrl + '/' + file);
                        return originalFetch(assetsUrl + '/' + file, options);
                    }
                }
            }
            return originalFetch(url, options);
        };
        
        // 2. Fix loadCombo function by overriding it
        // This is specifically targeting your code based on the error logs
        window.LR100_overrideFunctions = function() {
            if (window.loadCombo) {
                const originalLoadCombo = window.loadCombo;
                window.loadCombo = function(fileName, onLoad) {
                    if (!fileName) return;
                    
                    // Override to always use the correct assets URL
                    const correctPath = assetsUrl + '/' + fileName;
                    console.log('LR100: Fixing loadCombo path', fileName, '->', correctPath);
                    
                    // Use original function with corrected path
                    if (window.loader && window.loader.load) {
                        window.loader.load(
                            correctPath,
                            function(gltf) {
                                if (onLoad) onLoad(gltf.scene);
                            },
                            undefined,
                            function(error) {
                                console.error('LR100: Error loading model:', fileName, error);
                            }
                        );
                    } else {
                        console.error('LR100: loader not available yet');
                    }
                };
            }
        };
        
        // 3. Fix Web Worker loading 
        const originalWorker = window.Worker;
        window.Worker = function(url, options) {
            if (url instanceof URL) {
                const urlString = url.toString();
                if (urlString.includes('physicsWorker')) {
                    const workerUrl = assetsUrl + "/physicsWorker-iiFlsN1r.js";
                    console.log('LR100: Fixing Worker path', urlString, '->', workerUrl);
                    return new originalWorker(workerUrl, options);
                }
            }
            return new originalWorker(url, options);
        };
        
        // 4. Wait for THREE.js to load, then patch asset loaders
        const waitForMainJs = setInterval(() => {
            // Check if main script has initialized key functions
            if (window.THREE) {
                clearInterval(waitForMainJs);
                console.log('LR100: THREE.js detected, patching loaders');
                
                // Fix TextureLoader
                if (THREE.TextureLoader) {
                    const originalTextureLoad = THREE.TextureLoader.prototype.load;
                    THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                        if (typeof url === 'string') {
                            if (url.startsWith('./assets/')) {
                                const newUrl = assetsUrl + '/' + url.substring(9);
                                console.log('LR100: Fixing texture path', url, '->', newUrl);
                                return originalTextureLoad.call(this, newUrl, onLoad, onProgress, onError);
                            } else {
                                // Check if it's a texture file by extension
                                const textureExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
                                const isTexture = textureExts.some(ext => url.toLowerCase().endsWith(ext));
                                if (isTexture) {
                                    const fileName = url.split('/').pop();
                                    const newUrl = assetsUrl + '/' + fileName;
                                    console.log('LR100: Fixing texture filename', url, '->', newUrl);
                                    return originalTextureLoad.call(this, newUrl, onLoad, onProgress, onError);
                                }
                            }
                        }
                        return originalTextureLoad.call(this, url, onLoad, onProgress, onError);
                    };
                }
                
                // Fix GLTFLoader
                if (THREE.GLTFLoader) {
                    const originalGLTFLoad = THREE.GLTFLoader.prototype.load;
                    THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                        if (typeof url === 'string') {
                            // Case 1: Relative path starting with ./assets/
                            if (url.startsWith('./assets/')) {
                                const newUrl = assetsUrl + '/' + url.substring(9);
                                console.log('LR100: Fixing GLTF path (case 1)', url, '->', newUrl);
                                return originalGLTFLoad.call(this, newUrl, onLoad, onProgress, onError);
                            } 
                            // Case 2: Any URL containing /assets/ followed by a GLTF file
                            else if (url.includes('/assets/') && url.toLowerCase().endsWith('.gltf')) {
                                const fileName = url.split('/').pop();
                                const newUrl = assetsUrl + '/' + fileName;
                                console.log('LR100: Fixing GLTF path (case 2)', url, '->', newUrl);
                                return originalGLTFLoad.call(this, newUrl, onLoad, onProgress, onError);
                            }
                            // Case 3: Any URL ending with a known model file
                            else if (url.toLowerCase().endsWith('.gltf')) {
                                const fileName = url.split('/').pop();
                                const newUrl = assetsUrl + '/' + fileName;
                                console.log('LR100: Fixing GLTF path (case 3)', url, '->', newUrl);
                                return originalGLTFLoad.call(this, newUrl, onLoad, onProgress, onError);
                            }
                        }
                        return originalGLTFLoad.call(this, url, onLoad, onProgress, onError);
                    };
                }
                
                // Try to override your loadCombo function at multiple points
                window.LR100_overrideFunctions();
                setTimeout(window.LR100_overrideFunctions, 500);
                setTimeout(window.LR100_overrideFunctions, 1000);
                setTimeout(window.LR100_overrideFunctions, 2000);
            }
        }, 100);
        
        // 5. Create a global callback to override inline functions
        window.fixModelPaths = function() {
            // Detect if main script has initialized
            if (window.loadCombo) {
                console.log('LR100: Found loadCombo function, overriding');
                window.LR100_overrideFunctions();
            }
        };
        
        // Load the main JS as a module
        const script = document.createElement('script');
        script.type = 'module';
        script.src = assetsUrl + '/index-Da-JLo9O.js';
        script.onload = function() {
            console.log('LR100: Main script loaded, checking for functions to override');
            setTimeout(window.fixModelPaths, 500);
            setTimeout(window.fixModelPaths, 1000);
        };
        script.onerror = function(error) {
            console.error('LR100: Error loading main script:', error);
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

