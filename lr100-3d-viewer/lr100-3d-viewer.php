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
        
        // Get assets URLs
        $plugin_url = plugin_dir_url(__FILE__);
        $assets_url = $plugin_url . 'dist/assets';
        
        // Create container with unique ID
        $container_id = 'lr100-container-' . uniqid();
        $output = '<div id="' . $container_id . '" class="lr100-container" style="width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';">';
        
        // Add an initial loading message
        $output .= '<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; background-color: #f0f0f0;">';
        $output .= '<p>Loading 3D Viewer...</p>';
        $output .= '</div>';
        
        $output .= '</div>';
        
        // Add inline script to load everything correctly
        $output .= '<script>';
        $output .= 'document.addEventListener("DOMContentLoaded", function() {';
        $output .= '    const container = document.getElementById("' . $container_id . '");';
        $output .= '    const assetsUrl = "' . esc_js($assets_url) . '";';
        $output .= '    const pluginUrl = "' . esc_js($plugin_url) . '";';
        
        // First, load THREE.js
        $output .= '    // Create container elements';
        $output .= '    container.innerHTML = `';
        if ($atts['include_controls'] === 'true') {
            $output .= '<div id="top-bar">
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
                        </div>';
        }
        
        $output .= '<div id="top-overlay" style="position: fixed; z-index: 10000; top: 0; left: 0; width: 100%; pointer-events: none;"></div>
                    <div id="canvas-container">
                        <div id="canvas-overlay">
                            <p>Click and Drag to Rotate</p>
                        </div>
                        <canvas id="lr100-canvas"></canvas>
                    </div>`;';
        
        // Load the CSS file directly
        $output .= '    const cssFile = document.createElement("link");';
        $output .= '    cssFile.rel = "stylesheet";';
        $output .= '    cssFile.href = assetsUrl + "/index-Ds3WH6D6.css";';
        $output .= '    document.head.appendChild(cssFile);';
        
        // Patch module script loader
        $output .= '    // Function to patch module paths';
        $output .= '    function monkeyPatchModuleLoader() {';
        $output .= '        // Store original fetch';
        $output .= '        const originalFetch = window.fetch;';
        $output .= '        window.fetch = function(url, options) {';
        $output .= '            if (typeof url === "string" && url.startsWith("/assets/")) {';
        $output .= '                console.log("Patching fetch URL:", url, "->", assetsUrl + url.substring(7));';
        $output .= '                return originalFetch(assetsUrl + url.substring(7), options);';
        $output .= '            }';
        $output .= '            return originalFetch(url, options);';
        $output .= '        };';
        
        // Patch Worker constructor to fix Web Worker loading
        $output .= '        const originalWorker = window.Worker;';
        $output .= '        window.Worker = function(url, options) {';
        $output .= '            if (url instanceof URL) {';
        $output .= '                const urlString = url.toString();';
        $output .= '                if (urlString.includes("physicsWorker")) {';
        $output .= '                    console.log("Patching Worker URL:", urlString, "->", assetsUrl + "/physicsWorker-iiFlsN1r.js");';
        $output .= '                    return new originalWorker(assetsUrl + "/physicsWorker-iiFlsN1r.js", options);';
        $output .= '                }';
        $output .= '            }';
        $output .= '            return new originalWorker(url, options);';
        $output .= '        };';
        
        // Patch TextureLoader and GLTFLoader to fix asset paths
        $output .= '        // Wait for THREE to be available, then patch loaders';
        $output .= '        const checkForThree = setInterval(() => {';
        $output .= '            if (window.THREE) {';
        $output .= '                clearInterval(checkForThree);';
        $output .= '                console.log("THREE.js detected, patching loaders");';
        
        // Patch TextureLoader
        $output .= '                if (THREE.TextureLoader) {';
        $output .= '                    const originalTextureLoad = THREE.TextureLoader.prototype.load;';
        $output .= '                    THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {';
        $output .= '                        if (typeof url === "string" && url.startsWith("./assets/")) {';
        $output .= '                            console.log("Patching texture URL:", url, "->", assetsUrl + "/" + url.substring(9));';
        $output .= '                            return originalTextureLoad.call(this, assetsUrl + "/" + url.substring(9), onLoad, onProgress, onError);';
        $output .= '                        }';
        $output .= '                        return originalTextureLoad.call(this, url, onLoad, onProgress, onError);';
        $output .= '                    };';
        $output .= '                }';
        
        // Patch GLTFLoader
        $output .= '                if (THREE.GLTFLoader) {';
        $output .= '                    const originalGLTFLoad = THREE.GLTFLoader.prototype.load;';
        $output .= '                    THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {';
        $output .= '                        if (typeof url === "string" && url.startsWith("./assets/")) {';
        $output .= '                            console.log("Patching GLTF URL:", url, "->", assetsUrl + "/" + url.substring(9));';
        $output .= '                            return originalGLTFLoad.call(this, assetsUrl + "/" + url.substring(9), onLoad, onProgress, onError);';
        $output .= '                        }';
        $output .= '                        return originalGLTFLoad.call(this, url, onLoad, onProgress, onError);';
        $output .= '                    };';
        $output .= '                }';
        $output .= '            }';
        $output .= '        }, 100);';
        $output .= '    }';
        
        // Apply patches and load the script as a module
        $output .= '    monkeyPatchModuleLoader();';
        
        // Let's explicitly add a script tag with type="module" to properly load the ES6 module
        $output .= '    const scriptModule = document.createElement("script");';
        $output .= '    scriptModule.type = "module";';
        $output .= '    scriptModule.src = assetsUrl + "/index-Da-JLo9O.js";';
        $output .= '    document.body.appendChild(scriptModule);';
        $output .= '});';
        $output .= '</script>';
        
        return $output;
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');

