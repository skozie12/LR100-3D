<?php
/*
Plugin Name: LR100 3D Viewer
Description: Integrates the LR100 3D visualization tool into WordPress as an ES module with correct asset paths
Version: 1.0.2
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
        // Register assets on front-end
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        // Shortcode to display the viewer
        add_shortcode('lr100_3d', array($this, 'render_shortcode'));
        // Activation: ensure folders exist
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
    }

    public function activate_plugin() {
        $dist  = plugin_dir_path(__FILE__) . 'dist';
        $assets = $dist . '/assets';
        if (!file_exists($assets)) {
            wp_mkdir_p($assets);
        }
    }

    public function register_assets() {
        $assets_dir = plugin_dir_path(__FILE__) . 'dist/assets';
        $assets_url = plugin_dir_url(__FILE__)  . 'dist/assets';

        if (!is_dir($assets_dir)) {
            return;
        }

        // Register JS bundles (as ES modules) and set public path
        foreach (glob($assets_dir . '/index*.js') as $js_file) {
            $filename = basename($js_file);
            $handle   = 'lr100-3d-' . sanitize_title(pathinfo($filename, PATHINFO_FILENAME));

            wp_register_script(
                $handle,
                $assets_url . '/' . $filename,
                array(),
                filemtime($js_file),
                true
            );
            // Load as ES module
            wp_script_add_data($handle, 'type', 'module');
            // Ensure Vite's import.meta.env.BASE_URL points to plugin assets
            $public_path = esc_js($assets_url . '/');
            wp_add_inline_script(
                $handle,
                "import.meta.env.BASE_URL = '{$public_path}';",
                'before'
            );
        }

        // Register CSS bundles
        foreach (glob($assets_dir . '/index*.css') as $css_file) {
            $filename = basename($css_file);
            $handle   = 'lr100-3d-' . sanitize_title(pathinfo($filename, PATHINFO_FILENAME));

            wp_register_style(
                $handle,
                $assets_url . '/' . $filename,
                array(),
                filemtime($css_file)
            );
        }
    }

    public function render_shortcode($atts) {
        // Shortcode attributes
        $atts = shortcode_atts(array(
            'width'  => '100%',
            'height' => '600px'
        ), $atts, 'lr100_3d');

        // Enqueue all registered scripts & styles for this plugin
        global $wp_scripts, $wp_styles;

        foreach ($wp_scripts->registered as $handle => $script) {
            if (0 === strpos($handle, 'lr100-3d-') && pathinfo($script->src, PATHINFO_EXTENSION) === 'js') {
                wp_enqueue_script($handle);
            }
        }
        foreach ($wp_styles->registered as $handle => $style) {
            if (0 === strpos($handle, 'lr100-3d-') && pathinfo($style->src, PATHINFO_EXTENSION) === 'css') {
                wp_enqueue_style($handle);
            }
        }

        // Output container markup
        $style_attr = sprintf('width:%s;height:%s;', esc_attr($atts['width']), esc_attr($atts['height']));
        return "<div id=\"lr100-canvas-container\" style=\"{$style_attr}\">
                    <canvas id=\"lr100-canvas\"></canvas>
                    <div id=\"canvas-overlay\"></div>
                    <div id=\"price-display\"></div>
                </div>";
    }
}

// Initialize the plugin
function lr100_3d_viewer_init() {
    LR100_3D_Viewer::get_instance();
}
add_action('plugins_loaded', 'lr100_3d_viewer_init');
