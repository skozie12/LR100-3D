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
        
        // Debug function
        function debug(message, ...args) {
            if (DEBUG) {
                console.log(`LR100 DEBUG: ${message}`, ...args);
            } else {
                console.log(`LR100: ${message}`, ...args);
            }
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

        // The most direct way to fix the model loading issues:
        // 1. Replace the loadCombo function immediately
        window.loadCombo = function(fileName, onLoad) {
            if (!fileName) return;
            console.log('LR100: loadCombo called with:', fileName);
            
            // Always use the correct assets URL
            const correctPath = assetsUrl + '/' + fileName;
            console.log('LR100: Using correct path:', correctPath);
            
            // Use THREE.GLTFLoader to load the model
            if (!window.loader) {
                window.loader = new THREE.GLTFLoader();
            }
            
            window.loader.load(
                correctPath,
                function(gltf) {
                    console.log('LR100: Model loaded successfully:', fileName);
                    const model = gltf.scene;
                    model.rotation.y = Math.PI;
                    model.position.x = 0.57;
                    model.position.y = 0.225;
                    window.scene.add(model);
                    if (onLoad) onLoad(model);
                },
                undefined,
                function(error) {
                    console.error('LR100: Error loading model:', fileName, error);
                }
            );
        };
        
        // 2. Fix all URLs in the loadCombo function in your codebase
        const fixLoadComboFunc = setInterval(() => {
            // Check if the original loadCombo was loaded from your script
            if (typeof window.loadCombo === 'function' && window.loadCombo.toString().includes('loader.load')) {
                clearInterval(fixLoadComboFunc);
                console.log('LR100: Found and fixing loadCombo function');
                
                // Override loadCombo again to ensure our version is used
                const originalLoadCombo = window.loadCombo;
                window.loadCombo = function(fileName, onLoad) {
                    if (!fileName) return;
                    console.log('LR100: Using fixed loadCombo for:', fileName);
                    
                    // Always use the correct assets URL
                    const correctPath = assetsUrl + '/' + fileName;
                    
                    if (window.loader && window.loader.load) {
                        console.log('LR100: Loading model from:', correctPath);
                        window.loader.load(
                            correctPath,
                            function(gltf) {
                                console.log('LR100: Model loaded successfully:', fileName);
                                const model = gltf.scene;
                                if (onLoad) onLoad(model);
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
        }, 200);
        
        // 3. Also fix the URLs in any direct GLTFLoader calls
        const fixGltfLoaderCalls = setInterval(() => {
            if (window.THREE && window.THREE.GLTFLoader) {
                clearInterval(fixGltfLoaderCalls);
                
                // Create a wrapper around the GLTFLoader
                const origGLTFLoader = window.THREE.GLTFLoader;
                window.THREE.GLTFLoader = function(...args) {
                    const loader = new origGLTFLoader(...args);
                    const origLoad = loader.load;
                    
                    loader.load = function(url, onLoad, onProgress, onError) {
                        let newUrl = url;
                        
                        // Handle common paths we've seen in error messages
                        if (typeof url === 'string') {
                            // Match for a specific pattern we saw in your errors
                            if (url.includes('/length-measurement-configurator/assets/')) {
                                const fileName = url.split('/assets/').pop();
                                newUrl = assetsUrl + '/' + fileName;
                                console.log('LR100: Fixed length-measurement-configurator path:', url, '->', newUrl);
                            }
                            // Match common GLTF model patterns
                            else if (url.endsWith('.gltf')) {
                                const fileName = url.split('/').pop();
                                newUrl = assetsUrl + '/' + fileName;
                                console.log('LR100: Fixed GLTF model path:', url, '->', newUrl);
                            }
                        }
                        
                        return origLoad.call(loader, newUrl, onLoad, onProgress, onError);
                    };
                    
                    return loader;
                };
            }
        }, 200);

        // 4. Fix the fetch function for network requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                let newUrl = url;
                let modified = false;
                
                // This is the specific URL pattern from your error message
                if (url.includes('/length-measurement-configurator/assets/')) {
                    const assetName = url.split('/assets/').pop();
                    newUrl = assetsUrl + '/' + assetName;
                    modified = true;
                    console.log('LR100: Fixed fetch URL:', url, '->', newUrl);
                }
                
                // Additional specific pattern matching for model files mentioned in errors known models
                if (url.includes('/assets/LR100-284.gltf') || se().endsWith('.gltf'))) {
                    url.includes('/assets/284-SPOOL.gltf') ||
                    url.includes('/assets/1410.gltf')) {
                    const fileName = url.split('/').pop();
                    newUrl = assetsUrl + '/' + fileName;rl, '->', newUrl);
                    modified = true;
                    console.log('LR100: Fixed specific model URL:', url, '->', newUrl);
                }
                );
                // General pattern matching for any GLTF file
                if (url.includes('/assets/') && url.toLowerCase().endsWith('.gltf')) {
                    const fileName = url.split('/').pop();n originalFetch(url, options);
                    newUrl = assetsUrl + '/' + fileName;
                    modified = true;
                    console.log('LR100: Fixed general GLTF model URL:', url, '->', newUrl);might use it instead of fetch
                }ginalXHROpen = XMLHttpRequest.prototype.open;
                
                if (modified) {
                    return originalFetch(newUrl, options);
                }
            }
            return originalFetch(url, options);
        };s/')) {
        ts/').pop();
        // Also intercept XMLHttpRequest for loaders that might use it instead of fetch
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {url, '->', newUrl);
            if (typeof url === 'string') {
                let newUrl = url;
                let modified = false;les
                werCase().endsWith('.gltf'))) {
                // Check for the specific path pattern
                if (url.includes('/length-measurement-configurator/assets/')) {
                    const assetName = url.split('/assets/').pop();
                    newUrl = assetsUrl + '/' + assetName;RL:', url, '->', newUrl);
                    modified = true;
                    console.log('LR100: Fixed XHR URL:', url, '->', newUrl);
                }ified ? newUrl : url, ...rest);
                
                // Additional specific pattern matching for model files
                if (url.includes('/assets/LR100-284.gltf') || 
                    url.includes('/assets/284-SPOOL.gltf') ||
                    url.includes('/assets/1410.gltf') ||
                    url.includes('/assets/100-99-STAND.gltf') ||
                    url.includes('/assets/100-99-MOVING.gltf') ||
                    (url.includes('/assets/') && url.toLowerCase().endsWith('.gltf'))) {Url + '/LR100-284.gltf',
                    const fileName = url.split('/').pop();
                    newUrl = assetsUrl + '/' + fileName;ssetsUrl + '/1410.gltf',
                    modified = true;
                    console.log('LR100: Fixed specific XHR model URL:', url, '->', newUrl);
                }gltf',
                
                return originalXHROpen.call(this, method, modified ? newUrl : url, ...rest);
            }
            return originalXHROpen.apply(this, arguments);
        };

        // Create a map of known problematic model files and their correct paths  '100-10-MOVING.gltf': assetsUrl + '/100-10-MOVING.gltf',
        const modelMap = {    
            'LR100-284.gltf': assetsUrl + '/LR100-284.gltf',
            '284-SPOOL.gltf': assetsUrl + '/284-SPOOL.gltf',ltf',
            '1410.gltf': assetsUrl + '/1410.gltf',
            '100-10.gltf': assetsUrl + '/100-10.gltf',
            '100-99.gltf': assetsUrl + '/100-99.gltf',
            '100-200.gltf': assetsUrl + '/100-200.gltf',rror handling
            '1410C.gltf': assetsUrl + '/1410C.gltf',
            '100-99-STAND.gltf': assetsUrl + '/100-99-STAND.gltf',
            '100-99-MOVING.gltf': assetsUrl + '/100-99-MOVING.gltf'ded to lr100LoadModel');
        };
        
        // Directly inject a helper function to handle model loading
        window.lr100LoadModel = function(modelName, callback) {elName] || (assetsUrl + '/' + modelName);
            const correctPath = modelMap[modelName] || (assetsUrl + '/' + modelName);ad model from:', correctPath);
            console.log('LR100: Attempting to load model from:', correctPath);
            
            // First try fetch to verify the file existsindow.loader.load) {
            fetch(correctPath, { method: 'HEAD' }):', modelName);
                .then(response => {
                    if (response.ok) {load(
                        console.log('LR100: Model file confirmed to exist:', modelName);
                        if (window.loader && window.loader.load) {
                            window.loader.load(R100: Successfully loaded model:', modelName);
                                correctPath,f.scene);
                                function(gltf) {,
                                    console.log('LR100: Successfully loaded model:', modelName);) {
                                    if (callback) callback(gltf.scene);
                                },
                                function(progress) {              const percentComplete = Math.round((progress.loaded / progress.total) * 100);
                                    // Progress tracking if needed`LR100: Model ${modelName} loading: ${percentComplete}%`);
                                },
                                function(error) {
                                    console.error('LR100: Error loading model despite file existing:', modelName, error);n(error) {
                                }                    console.error('LR100: Error loading model:', modelName, error);
                            );k for critical models
                        }dow.THREE.GLTFLoader) {
                    } else {
                        console.error('LR100: Model file not found at:', correctPath);dow.THREE.GLTFLoader();
                    }                    loader.load(correctPath, 
                })(gltf) {
                .catch(error => {
                    console.error('LR100: Error checking model file:', error);tf.scene);
                });                    },
        };
        
        // Monitor for specific error messages and try to recoverror('LR100: Fallback loading failed:', modelName, fallbackError);
        const originalConsoleError = console.error;
        console.error = function(...args) {
            originalConsoleError.apply(console, args);
            
            const errorMsg = args.join(' ');
            if (errorMsg.includes('Error loading combo file') || ch (e) {
                errorMsg.includes('Error loading spool model')) {            console.error('LR100: Exception during model loading:', e);
                
                // Extract model name from error message if possible
                const modelMatch = errorMsg.match(/\/assets\/([^"]+\.gltf)/);LR100: GLTFLoader not available');
                if (modelMatch && modelMatch[1]) {
                    const modelName = modelMatch[1];
                    console.log('LR100: Attempting recovery for failed model:', modelName);
                    window.lr100LoadModel(modelName);r specific error messages and try to recover
                }
            }on(...args) {
        };
        
        // Load the main JS as a modulerorMsg = args.join(' ');
        const script = document.createElement('script');
        script.type = 'module';
        script.src = assetsUrl + '/index-Da-JLo9O.js';
        script.onload = function() {
            console.log('LR100: Main script loaded successfully');rMsg.match(/\/assets\/([^"]+\.gltf)/);
            
            // Set a timer to check if models are loading properly
            setTimeout(() => {covery for failed model:', modelName);
                if (window.scene) {
                    console.log('LR100: 3D scene initialized successfully');
                    
                    // Proactively load critical models that might be needed
                    const criticalModels = [
                        '100-10-STAND.gltf', 
                        '100-10-MOVING.gltf',
                        '100-99-STAND.gltf', 
                        '100-99-MOVING.gltf',assetsUrl + '/index-Da-JLo9O.js';
                        '100-200-STAND.gltf', ript.onload = function() {
                        '100-200-MOVING.gltf't loaded successfully');
                    ];
                    
                    console.log('LR100: Preloading critical models');ut(() => {
                    criticalModels.forEach(model => {
                        window.lr100LoadModel(model);            console.log('LR100: 3D scene initialized successfully');
                    });
                    nitialize them
                    // Check if any model selection elements exist and initialize them
                    const selects = ['coilerSelect', 'reelStandSelect', 'counterSelect', 'cutterSelect'];       selects.forEach(selectId => {
                    selects.forEach(selectId => {electId);
                        const select = document.getElementById(selectId);            if (select) {
                        if (select) {                           console.log(`LR100: Found ${selectId}, registering change handler`);
                            console.log(`LR100: Found ${selectId}, registering change handler`);                            select.addEventListener('change', function() {
                            select.addEventListener('change', function() {        if (this.value) {
                                if (this.value) {ow.lr100LoadModel(this.value, function(model) {
                                    window.lr100LoadModel(this.value, function(model) {    console.log('LR100: Model loaded via select:', select.value);
                                        console.log('LR100: Model loaded via select:', select.value);                                    });
                                    });                                }
                                }
                            });                       }
                        }                    });
                    });
                    
                    // Fix for specific models that might be referenced differently
                    window.originalLoadModel = window.loadModel;       script.onerror = function(error) {
                    if (window.loadModel) { script:', error);






























add_action('plugins_loaded', 'lr100_3d_viewer_init');}    LR100_3D_Viewer::get_instance();function lr100_3d_viewer_init() {// Initialize the plugin}    }        return $output;HTML;</script>})();    });        document.body.appendChild(script);        };            container.innerHTML = '<div style="color: red; padding: 20px;">Error loading 3D viewer. Please check the console for details.</div>';            console.error('LR100: Failed to load main script:', error);        script.onerror = function(error) {        };            }, 1000);                }                    console.error('LR100: Scene not initialized after timeout');                } else {                    }                        };                            window.lr100LoadModel(fileName);                            console.log('LR100: Intercepted loadModel call for:', fileName);                            const fileName = url.split('/').pop();                        window.loadModel = function(url) {            container.innerHTML = '<div style="color: red; padding: 20px;">Error loading 3D viewer. Please check the console for details.</div>';
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