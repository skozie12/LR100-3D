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
        // Register scripts, styles & shortcode
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_shortcode('lr100_3d', array($this, 'lr100_3d_shortcode'));
        
        // Register activation hook
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
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
        $assets_dir = plugin_dir_path(__FILE__) . 'dist/assets';
        $assets_url = plugin_dir_url(__FILE__) . 'dist/assets';
        
        // Register main CSS file(s)
        $css_files = glob($assets_dir . '/*.css');
        if (!empty($css_files)) {
            foreach ($css_files as $css_file) {
                $css_filename = basename($css_file);
                $css_handle = 'lr100-3d-' . pathinfo($css_filename, PATHINFO_FILENAME);
                wp_register_style(
                    $css_handle,
                    $assets_url . '/' . $css_filename,
                    array(),
                    filemtime($css_file)
                );
            }
        }
        
        // Register main JS file(s)
        $js_files = glob($assets_dir . '/*.js');
        if (!empty($js_files)) {
            foreach ($js_files as $js_file) {
                $js_filename = basename($js_file);
                $js_handle = 'lr100-3d-' . pathinfo($js_filename, PATHINFO_FILENAME);
                wp_register_script(
                    $js_handle,
                    $assets_url . '/' . $js_filename,
                    array(), 
                    filemtime($js_file),
                    true
                );
            }
        }
    }
    
    public function lr100_3d_shortcode($atts) {
        // Extract attributes
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
        ), $atts);
        
        // Enqueue all registered styles and scripts
        $css_files = glob(plugin_dir_path(__FILE__) . 'dist/assets/*.css');
        if (!empty($css_files)) {
            foreach ($css_files as $css_file) {
                $css_handle = 'lr100-3d-' . pathinfo(basename($css_file), PATHINFO_FILENAME);
                wp_enqueue_style($css_handle);
            }
        }
        
        $js_files = glob(plugin_dir_path(__FILE__) . 'dist/assets/*.js');
        if (!empty($js_files)) {
            foreach ($js_files as $js_file) {
                $js_handle = 'lr100-3d-' . pathinfo(basename($js_file), PATHINFO_FILENAME);
                wp_enqueue_script($js_handle);
            }
        }
        
        // Define inline styles for the container
        $styles = 'width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';';
        
        // Output the container divs with required IDs
        $output = '<div id="lr100-canvas-container" style="' . $styles . '">';
        $output .= '<canvas id="lr100-canvas"></canvas>';
        $output .= '<div id="canvas-overlay"></div>';
        $output .= '<div id="price-display"></div>';
        $output .= '</div>';
        
        return $output;
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');

