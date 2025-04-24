<?php
/*
Plugin Name: LR100-3D Configuration Tool
Description: Integrates the LR100 3D visualization tool into WordPress
Version: 1.0.1
Author: Duncan Smith
*/

// Exit if accessed directly
if (!defined('ABSPATH')) exit;

function lr100_debug_info($message) {
    if (WP_DEBUG) {
        error_log('LR100 Debug: ' . $message);
    }
}

class LR100_3D_Viewer {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
       
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_shortcode('lr100_3d', array($this, 'lr100_3d_shortcode'));
        
        
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
        
        
        if (WP_DEBUG) {
            add_action('wp_footer', array($this, 'debug_footer'));
        }
    }
    
    public function activate_plugin() {
        
        if (!file_exists(plugin_dir_path(__FILE__) . 'dist')) {
            wp_mkdir_p(plugin_dir_path(__FILE__) . 'dist');
        }
        
        if (!file_exists(plugin_dir_path(__FILE__) . 'dist/assets')) {
            wp_mkdir_p(plugin_dir_path(__FILE__) . 'dist/assets');
        }
        
        lr100_debug_info('Plugin activated');
    }
    
    public function debug_footer() {
        echo "<!-- LR100 3D Viewer Debug Information -->\n";
        echo "<!-- Plugin path: " . plugin_dir_path(__FILE__) . " -->\n";
        echo "<!-- Plugin URL: " . plugin_dir_url(__FILE__) . " -->\n";
        
        $assets_dir = plugin_dir_path(__FILE__) . 'dist/assets';
        echo "<!-- Assets directory: " . $assets_dir . " -->\n";
        
        if (is_dir($assets_dir)) {
            $js_files = glob($assets_dir . '/*.js');
            echo "<!-- Found JS files: " . implode(', ', array_map('basename', $js_files)) . " -->\n";
            
            $css_files = glob($assets_dir . '/*.css');
            echo "<!-- Found CSS files: " . implode(', ', array_map('basename', $css_files)) . " -->\n";
        } else {
            echo "<!-- Assets directory not found -->\n";
        }
    }
    
    public function register_assets() {
        
        $assets_dir = plugin_dir_path(__FILE__) . 'dist/assets';
        $assets_url = plugin_dir_url(__FILE__) . 'dist/assets';
        
        lr100_debug_info('Registering assets from: ' . $assets_dir);
        
        
        if (!is_dir($assets_dir)) {
            lr100_debug_info('Assets directory not found: ' . $assets_dir);
            return;
        }
        
        $css_files = glob($assets_dir . '/index*.css');
        if (!empty($css_files)) {
            foreach ($css_files as $css_file) {
                $css_filename = basename($css_file);
                $css_handle = 'lr100-3d-css';
                wp_register_style(
                    $css_handle,
                    $assets_url . '/' . $css_filename,
                    array(),
                    filemtime($css_file)
                );
                lr100_debug_info('Registered CSS: ' . $css_filename);
            }
        } else {
            lr100_debug_info('No CSS files found matching pattern index*.css');
        }
        
        $js_files = glob($assets_dir . '/index*.js');
        if (!empty($js_files)) {
            foreach ($js_files as $js_file) {
                $js_filename = basename($js_file);
                $js_handle = 'lr100-3d-main';
                wp_register_script(
                    $js_handle,
                    $assets_url . '/' . $js_filename,
                    array(), 
                    filemtime($js_file),
                    true
                );
                lr100_debug_info('Registered main JS: ' . $js_filename);
            }
        } else {
            lr100_debug_info('No JS files found matching pattern index*.js');
        }
        
        $worker_files = glob($assets_dir . '/physicsWorker*.js');
        if (!empty($worker_files)) {
            foreach ($worker_files as $worker_file) {
                $worker_filename = basename($worker_file);
                $worker_handle = 'lr100-3d-worker';
                wp_register_script(
                    $worker_handle,
                    $assets_url . '/' . $worker_filename,
                    array(), 
                    filemtime($worker_file),
                    true
                );
                lr100_debug_info('Registered worker JS: ' . $worker_filename);
            }
        }
        
        wp_localize_script(
            'lr100-3d-main',
            'lr100_3d_config',
            array(
                'assets_url' => $assets_url,
                'plugin_url' => plugin_dir_url(__FILE__),
                'worker_url' => $assets_url . '/' . basename($worker_files[0]),
                'is_wordpress' => true
            )
        );
        
        // Add inline script to fix asset paths and worker loading
        add_action('wp_head', function() use ($assets_url) {
            ?>
            <script>
            // Fix for Web Workers and asset paths in WordPress environment
            document.addEventListener('DOMContentLoaded', function() {
                // Create a global patch function that will be called before the main script loads
                window.LR100_patchWorkerAndPaths = function() {
                    // Fix asset paths by intercepting fetch requests
                    const originalFetch = window.fetch;
                    window.fetch = function(url, options) {
                        // Only intercept fetch requests for assets
                        if (typeof url === 'string' && url.startsWith('/assets/')) {
                            // Replace absolute path with WordPress plugin path
                            const newUrl = "<?php echo esc_js($assets_url); ?>" + url.substring(8);
                            console.log('Patched fetch URL:', url, '->', newUrl);
                            return originalFetch(newUrl, options);
                        }
                        return originalFetch(url, options);
                    };
                    
                    // Fix Worker loading by intercepting Worker constructor
                    const originalWorker = window.Worker;
                    window.Worker = function(url, options) {
                        if (url instanceof URL) {
                            // Handle URL objects with import.meta.url
                            const urlString = url.toString();
                            if (urlString.includes('physicsWorker')) {
                                // Replace with absolute plugin path
                                const workerUrl = "<?php echo esc_js($assets_url); ?>/physicsWorker-iiFlsN1r.js";
                                console.log('Patched Worker URL:', urlString, '->', workerUrl);
                                return new originalWorker(workerUrl, options);
                            }
                        }
                        return new originalWorker(url, options);
                    };
                    
                    // Fix resource loading like textures, 3D models, etc.
                    const originalTextureLoader = THREE?.TextureLoader;
                    if (originalTextureLoader) {
                        THREE.TextureLoader = class extends originalTextureLoader {
                            load(url, onLoad, onProgress, onError) {
                                if (typeof url === 'string' && url.startsWith('./assets/')) {
                                    const newUrl = "<?php echo esc_js($assets_url); ?>/" + url.substring(9);
                                    console.log('Patched texture URL:', url, '->', newUrl);
                                    return super.load(newUrl, onLoad, onProgress, onError);
                                }
                                return super.load(url, onLoad, onProgress, onError);
                            }
                        };
                    }
                    
                    // Fix GLTFLoader if it exists
                    if (THREE?.GLTFLoader) {
                        const originalGLTFLoader = THREE.GLTFLoader;
                        THREE.GLTFLoader = class extends originalGLTFLoader {
                            load(url, onLoad, onProgress, onError) {
                                if (typeof url === 'string' && url.startsWith('./assets/')) {
                                    const newUrl = "<?php echo esc_js($assets_url); ?>/" + url.substring(9);
                                    console.log('Patched GLTF URL:', url, '->', newUrl);
                                    return super.load(newUrl, onLoad, onProgress, onError);
                                }
                                return super.load(url, onLoad, onProgress, onError);
                            }
                        };
                    }
                };
                
                // Call our patch immediately for scripts loading later
                if (window.THREE) {
                    window.LR100_patchWorkerAndPaths();
                }
            });
            </script>
            <?php
        });
    }
    
    public function lr100_3d_shortcode($atts) {
        // Extract attributes
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
            'include_controls' => 'true'
        ), $atts);
        
        lr100_debug_info('Shortcode called with width=' . $atts['width'] . ', height=' . $atts['height']);
        
        // Enqueue the registered styles and scripts
        wp_enqueue_style('lr100-3d-css');
        wp_enqueue_script('lr100-3d-main');
        
        // Apply patches to fix paths before main script runs
        add_action('wp_footer', function() {
            ?>
            <script>
            // Execute the patch before THREE.js loads
            document.addEventListener('DOMContentLoaded', function() {
                if (window.LR100_patchWorkerAndPaths) {
                    window.LR100_patchWorkerAndPaths();
                }
            });
            </script>
            <?php
        }, 5); // Lower priority to ensure it runs before our scripts
        
        // Define inline styles for the container
        $styles = 'width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';';
        
        // Output the container divs with required IDs
        $output = '';
        
        // Include top bar controls if requested
        if ($atts['include_controls'] === 'true') {
            $output .= '<div id="top-bar">';
            $output .= '<div class="panel-title">LR100 Configuration</div>';
            
            $output .= '<label for="coilerSelect">Coiler:</label>';
            $output .= '<select id="coilerSelect">';
            $output .= '<option value="">-- Select Coiler --</option>';
            $output .= '<option value="100-10.gltf" id="100-10">Collapsible 16″ I.D. Coiler</option>';
            $output .= '<option value="100-99.gltf" id="100-99">Collapsible 12″ I.D. Coiler</option>';
            $output .= '<option value="100-200.gltf" id="100-200">Collapsible 8″ I.D. Coiler</option>';
            $output .= '</select>';
            
            $output .= '<label for="reelStandSelect">Reel Stand:</label>';
            $output .= '<select id="reelStandSelect">';
            $output .= '<option value="">-- Select Reel Stand --</option>';
            $output .= '<option value="LR100-284.gltf" id="100-284">Wind-off Reel Stand</option>';
            $output .= '</select>';
            
            $output .= '<label for="counterSelect">Counter:</label>';
            $output .= '<select id="counterSelect">';
            $output .= '<option value="">-- Select Counter --</option>';
            $output .= '<option value="1410.gltf" id="1410">Footage Counter</option>';
            $output .= '<option value="1410.gltf" id="1420">Metric Counter</option>';
            $output .= '<option value="1410.gltf" id="1410UR">Footage Counter with UR Wheels</option>';
            $output .= '<option value="1410.gltf" id="1420UR">Metric Counter with UR Wheels</option>';
            $output .= '</select>';
            
            $output .= '<label for="cutterSelect">Cutter:</label>';
            $output .= '<select id="cutterSelect" disabled>';
            $output .= '<option value="">-- Select Cutter --</option>';
            $output .= '<option value="1410C.gltf" id="100-C">Cutting Blade</option>';
            $output .= '</select>';
            
            $output .= '<button class="add-to-cart" id="addBtn">Add to cart</button>';
            $output .= '<div id="price-display"></div>';
            $output .= '</div>'; // Close top-bar
            
            // Add footer text
            $output .= '<div class="footer-text footer-left">';
            $output .= 'Note: LR100-284 does not include a spool, colours are subject to change';
            $output .= '</div>';
            $output .= '<div class="footer-text footer-right">';
            $output .= '© 2025 Taymer International, Inc. All rights reserved.';
            $output .= '</div>';
        }
        
        $output .= '<div id="lr100-canvas-container" style="' . $styles . '">';
        $output .= '<canvas id="lr100-canvas"></canvas>';
        $output .= '<div id="canvas-overlay"><p>Click and Drag to Rotate</p></div>';
        if ($atts['include_controls'] !== 'true') {
            $output .= '<div id="price-display"></div>';
        }
        $output .= '</div>';
        
        // Add debug info
        if (WP_DEBUG) {
            $output .= '<!-- LR100 3D Viewer shortcode rendered -->';
        }
        
        return $output;
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');

