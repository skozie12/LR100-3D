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

        // Set global asset path variable
        window.LR100_ASSET_PATH = assetsUrl + '/';
        console.log('LR100: Setting global asset path:', window.LR100_ASSET_PATH);

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

                // Fix any asset file with gltf, jpg, png extensions not already caught
                if ((url.includes('.gltf') || url.includes('.jpg') || url.includes('.png')) && 
                    !url.includes(assetsUrl)) {
                    const fileName = url.split('/').pop();
                    console.log('LR100: Fixing asset path by extension', url, '->', assetsUrl + '/' + fileName);
                    return originalFetch(assetsUrl + '/' + fileName, options);
                }
                
                // Fix other hardcoded paths that end with model filenames
                const modelFiles = [
                    '100-10-MOVING.gltf', '100-10-STAND.gltf', 
                    '100-99-MOVING.gltf', '100-99-STAND.gltf',
                    '100-200-MOVING.gltf', '100-200-STAND.gltf',
                    '1410.gltf', '1410C.gltf', '1410model.gltf',
                    '284-SPOOL.gltf', 'LR100-284.gltf',
                    'taymer_logo.png'
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
                    // Try to find the correct worker file
                    const workerFiles = [
                        "physicsWorker-iiFlsN1r.js",  // Try the known filename first
                        "physicsWorker.js"            // Try the original name if the hashed version doesn't exist
                    ];
                    
                    // Choose the first worker file that exists
                    const checkWorkerFile = async () => {
                        for (const workerFile of workerFiles) {
                            try {
                                const response = await fetch(assetsUrl + '/' + workerFile, { method: 'HEAD' });
                                if (response.ok) {
                                    const workerUrl = assetsUrl + '/' + workerFile;
                                    console.log('LR100: Fixing Worker path', urlString, '->', workerUrl);
                                    return new originalWorker(workerUrl, options);
                                }
                            } catch (e) {
                                console.warn('LR100: Worker file not found:', workerFile);
                            }
                        }
                        // If no worker file is found, use the original URL
                        return new originalWorker(url, options);
                    };
                    
                    // Since we can't use async in the constructor, we need to check synchronously
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
        
        // Function to try loading different script files
        function loadScript(urls, index = 0) {
            if (index >= urls.length) {
                console.error('LR100: Failed to load any script version');
                container.innerHTML = '<div style="color: red; padding: 20px;">Error loading 3D viewer. Please check console for details.</div>';
                return;
            }
            
            const script = document.createElement('script');
            script.type = 'module';
            script.src = urls[index];
            script.onload = function() {
                console.log('LR100: Successfully loaded script:', urls[index]);
                
                // When the script loads successfully, add a monkey patch for the loadCombo function
                // This is needed to override the loadCombo function in the compiled JS which might 
                // be using hardcoded paths
                setTimeout(() => {
                    if (window.loadCombo) {
                        console.log('LR100: Monkey patching loadCombo function');
                        const originalLoadCombo = window.loadCombo;
                        window.loadCombo = function(fileName, onLoad) {
                            if (!fileName) return;
                            
                            // Always use the asset URL from the global variable
                            const assetUrl = window.LR100_ASSET_PATH || assetsUrl + '/';
                            const correctPath = assetUrl + fileName;
                            console.log('LR100: Fixed loadCombo path', fileName, '->', correctPath);
                            
                            // This is using the loader object defined in the Three.js app
                            if (window.loader && window.loader.load) {
                                window.loader.load(
                                    correctPath,
                                    function(gltf) {
                                        console.log('LR100: Successfully loaded model:', fileName);
                                        if (onLoad) onLoad(gltf.scene);
                                    },
                                    function(xhr) {
                                        // Loading progress callback
                                        if (xhr.lengthComputable) {
                                            const percent = (xhr.loaded / xhr.total) * 100;
                                            console.log('LR100: Model loading: ' + percent.toFixed(2) + '%');
                                        }
                                    },
                                    function(error) {
                                        console.error('LR100: Error loading model:', fileName, error);
                                        // Try a fallback approach - use fetch first to see if the file exists at a different path
                                        fetch(assetsUrl + '/' + fileName, { method: 'HEAD' })
                                            .then(response => {
                                                if (response.ok) {
                                                    console.log('LR100: Found model at alternate path:', assetsUrl + '/' + fileName);
                                                    window.loader.load(
                                                        assetsUrl + '/' + fileName,
                                                        function(gltf) {
                                                            console.log('LR100: Successfully loaded model from alternate path:', fileName);
                                                            if (onLoad) onLoad(gltf.scene);
                                                        },
                                                        undefined,
                                                        function(error) {
                                                            console.error('LR100: Error loading model from alternate path:', fileName, error);
                                                        }
                                                    );
                                                }
                                            })
                                            .catch(() => {
                                                console.error('LR100: Model not found at any location:', fileName);
                                            });
                                    }
                                );
                            } else {
                                console.error('LR100: loader not available yet');
                            }
                        };
                    }
                    
                    // Also patch the THREE.TextureLoader prototype if available
                    if (window.THREE && window.THREE.TextureLoader) {
                        const originalTextureLoad = window.THREE.TextureLoader.prototype.load;
                        window.THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                            if (typeof url === 'string') {
                                // Fix hardcoded paths to length-measurement-configurator/assets/
                                if (url.includes('/length-measurement-configurator/assets/')) {
                                    const assetName = url.split('/assets/').pop();
                                    const newUrl = assetsUrl + '/' + assetName;
                                    console.log('LR100: Fixing texture path', url, '->', newUrl);
                                    return originalTextureLoad.call(this, newUrl, onLoad, onProgress, onError);
                                }
                                // Also fix any absolute paths that start with /assets/
                                if (url.startsWith('/assets/')) {
                                    const newUrl = assetsUrl + url.substring(7);
                                    console.log('LR100: Fixing absolute texture path', url, '->', newUrl);
                                    return originalTextureLoad.call(this, newUrl, onLoad, onProgress, onError);
                                }
                                // Fix relative paths starting with ./assets/
                                if (url.startsWith('./assets/')) {
                                    const newUrl = assetsUrl + '/' + url.substring(9);
                                    console.log('LR100: Fixing relative texture path', url, '->', newUrl);
                                    return originalTextureLoad.call(this, newUrl, onLoad, onProgress, onError);
                                }
                            }
                            return originalTextureLoad.call(this, url, onLoad, onProgress, onError);
                        };
                    }
                    
                    // Patch GLTFLoader if available
                    if (window.THREE && window.THREE.GLTFLoader) {
                        const originalGltfLoad = window.THREE.GLTFLoader.prototype.load;
                        window.THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                            if (typeof url === 'string') {
                                // Fix hardcoded paths to length-measurement-configurator/assets/
                                if (url.includes('/length-measurement-configurator/assets/')) {
                                    const assetName = url.split('/assets/').pop();
                                    const newUrl = assetsUrl + '/' + assetName;
                                    console.log('LR100: Fixing GLTF path', url, '->', newUrl);
                                    return originalGltfLoad.call(this, newUrl, onLoad, onProgress, onError);
                                }
                            }
                            return originalGltfLoad.call(this, url, onLoad, onProgress, onError);
                        };
                    }
                }, 200);
            };
            script.onerror = function(error) {
                console.error('LR100: Failed to load script:', urls[index]);
                // Try the next script in the array
                loadScript(urls, index + 1);
            };
            document.body.appendChild(script);
        }

        // Try to load different versions of the main script
        loadScript([
            assetsUrl + '/main.js',                  // Use the new non-hashed name from our build config
            pluginUrl + 'dist/main.js',              // Try alternative path
            assetsUrl + '/index.js',                 // Fallbacks
            assetsUrl + '/index-Da-JLo9O.js'         // Legacy name
        ]);
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

