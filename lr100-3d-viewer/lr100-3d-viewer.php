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
    private static \ = null;
    
    // Singleton pattern
    public static function get_instance() {
    
        if (self::\ === null) {
            self::\ = new self();
        }
        return self::\;
    }
    
    private function __construct() {
        // Register scripts, styles & shortcode
        add_action('wp_enqueue_scripts', array(\, 'register_assets'));
        add_shortcode('lr100_3d', array(\, 'lr100_3d_shortcode'));
        
        // Register activation hook
        register_activation_hook(__FILE__, array(\, 'activate_plugin'));
    }
    
    public function activate_plugin() {
        // Plugin activation logic if needed
        // Make sure dist folder exists
        if (!file_exists(plugin_dir_path(__FILE__) . 'dist')) {
            wp_mkdir_p(plugin_dir_path(__FILE__) . 'dist');
        }
    }
    
    public function register_assets() {
        // Get all files from the dist/assets directory
        \ = plugin_dir_path(__FILE__) . 'dist/assets';
        \ = plugin_dir_url(__FILE__) . 'dist/assets';
        
        // Register main CSS file(s)
        \ = glob(\ . '/*.css');
        if (!empty(\)) {
            foreach (\ as \) {
                \ = basename(\);
                \ = 'lr100-3d-' . pathinfo(\, PATHINFO_FILENAME);
                wp_register_style(
                    \,
                    \ . '/' . \,
                    array(),
                    filemtime(\)
                );
            }
        }
        
        // Register main JS file(s)
        \ = glob(\ . '/*.js');
        if (!empty(\)) {
            foreach (\ as \) {
                \ = basename(\);
                \ = 'lr100-3d-' . pathinfo(\, PATHINFO_FILENAME);
                wp_register_script(
                    \,
                    \ . '/' . \,
                    array(), 
                    filemtime(\),
                    true
                );
            }
        }
    }
    
    public function lr100_3d_shortcode(\) {
        // Extract attributes
        \ = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
        ), \);
        
        // Enqueue all registered styles and scripts
        \ = glob(plugin_dir_path(__FILE__) . 'dist/assets/*.css');
        if (!empty(\)) {
            foreach (\ as \) {
                \ = 'lr100-3d-' . pathinfo(basename(\), PATHINFO_FILENAME);
                wp_enqueue_style(\);
            }
        }
        
        \ = glob(plugin_dir_path(__FILE__) . 'dist/assets/*.js');
        if (!empty(\)) {
            foreach (\ as \) {
                \ = 'lr100-3d-' . pathinfo(basename(\), PATHINFO_FILENAME);
                wp_enqueue_script(\);
            }
        }
        
        // Define inline styles for the container
        \ = 'width: ' . esc_attr(\['width']) . '; height: ' . esc_attr(\['height']) . ';';
        
        // Output the container divs with required IDs
        \ = '<div id=\
lr100-canvas-container\ style=\ . \$styles . \>';
        \ .= '<canvas id=\lr100-canvas\></canvas>';
        \ .= '<div id=\canvas-overlay\></div>';
        \ .= '<div id=\price-display\></div>';
        \ .= '</div>';
        
        return \;
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');

