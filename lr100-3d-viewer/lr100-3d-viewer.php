<?php
/*
Plugin Name: LR100 3D Viewer
Description: Integrates the LR100 3D visualization tool into WordPress
Version: 1.0.5
Author: Duncan Smith
*/

// Exit if accessed directly
if (!defined('ABSPATH')) exit;

class LR100_3D_Viewer {
    private static $instance = null;
    
    // Store registered scripts and styles
    private $scripts = [];
    private $styles = [];

    // Singleton pattern
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Register assets and shortcode
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_shortcode('lr100_3d', array($this, 'render_shortcode'));
        
        // Add inline script to fix asset paths
        add_action('wp_head', array($this, 'add_path_fix_script'));
    }
    
    /**
     * Add an inline script to fix asset paths before the main script loads
     */
    public function add_path_fix_script() {
        $plugin_assets_url = plugins_url('dist/assets/', __FILE__);
        ?>
        <script>
            // Create a global variable to store the asset base URL
            window.LR100_CONFIG = {
                BASE_URL: '<?php echo esc_js($plugin_assets_url); ?>'
            };
            
            // Override the fetch function to intercept relative URLs and fix them
            const originalFetch = window.fetch;
            window.fetch = function(resource, options) {
                // Check if the resource URL starts with "/assets/"
                if (typeof resource === 'string' && resource.startsWith('/assets/')) {
                    // Replace with the correct plugin assets URL
                    resource = window.LR100_CONFIG.BASE_URL + resource.substring(8);
                }
                return originalFetch.call(this, resource, options);
            };
        </script>
        <?php
    }

    public function register_assets() {
        $plugin_url = plugin_dir_url(__FILE__);
        $plugin_path = plugin_dir_path(__FILE__);
        
        // Find JS files in dist/assets
        $js_files = glob($plugin_path . 'dist/assets/index-*.js');
        $worker_files = glob($plugin_path . 'dist/assets/physicsWorker-*.js');
        
        // Find CSS files
        $css_files = glob($plugin_path . 'dist/assets/index-*.css');
        
        // Register the main JS file if found
        if (!empty($js_files)) {
            $main_js_file = basename($js_files[0]);
            wp_register_script(
                'lr100-3d-viewer',
                $plugin_url . 'dist/assets/' . $main_js_file,
                array(),
                filemtime($js_files[0]),
                true
            );
            
            // Set base URL for assets
            wp_localize_script(
                'lr100-3d-viewer',
                'LR100_CONFIG',
                array(
                    'BASE_URL' => $plugin_url . 'dist/assets/'
                )
            );
            
            // Store for later use
            $this->scripts[] = 'lr100-3d-viewer';
        }
        
        // Register worker script if found
        if (!empty($worker_files)) {
            $worker_file = basename($worker_files[0]);
            wp_register_script(
                'lr100-3d-worker',
                $plugin_url . 'dist/assets/' . $worker_file,
                array(),
                filemtime($worker_files[0]),
                true
            );
            
            // Store for later use
            $this->scripts[] = 'lr100-3d-worker';
        }
        
        // Register CSS if found
        if (!empty($css_files)) {
            $css_file = basename($css_files[0]);
            wp_register_style(
                'lr100-3d-styles',
                $plugin_url . 'dist/assets/' . $css_file,
                array(),
                filemtime($css_files[0])
            );
            
            // Store for later use
            $this->styles[] = 'lr100-3d-styles';
        }
    }
    
    /**
     * Make scripts load as modules
     */
    public function add_module_type($tag, $handle, $src) {
        if (in_array($handle, $this->scripts)) {
            $tag = str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }

    public function render_shortcode($atts) {
        // Extract and sanitize attributes
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
            'controls' => 'true',
        ), $atts);
        
        // Sanitize attributes
        $width = esc_attr($atts['width']);
        $height = esc_attr($atts['height']);
        $show_controls = filter_var($atts['controls'], FILTER_VALIDATE_BOOLEAN);
        
        // Enqueue required styles
        wp_enqueue_style('lr100-3d-styles');
        
        // Enqueue scripts
        wp_enqueue_script('lr100-3d-viewer');
        
        // Add filter to transform script tags to modules
        add_filter('script_loader_tag', array($this, 'add_module_type'), 10, 3);
        
        // Buffer output
        ob_start();
        ?>
        <div id="lr100-canvas-container" style="width: <?php echo $width; ?>; height: <?php echo $height; ?>;">
            <div id="canvas-overlay">
                <p>Click and Drag to Rotate</p>
            </div>
            <canvas id="lr100-canvas"></canvas>
            <div id="price-display"></div>
        </div>
        
        <?php if ($show_controls): ?>
        <!-- Floating control panel -->
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
                <option value="">-- Select Counter --</option>
                <option value="1410C.gltf" id="100-C">Cutting Blade</option>
            </select>

            <button class="add-to-cart" id="addBtn">Add to cart</button>
        </div>
        <?php endif; ?>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');
