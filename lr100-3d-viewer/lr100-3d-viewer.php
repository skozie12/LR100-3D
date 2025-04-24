<?php
/**
 * Plugin Name: LR100 3D Viewer
 * Description: Integrates the LR100 3D visualization tool into WordPress
 * Version: 1.0
 * Author: Duncan Smith
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class LR100_3D_Viewer {
    private static $instance = null;

    public static function get_instance() {
        if ( self::$instance === null ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_shortcode( 'lr100_3d', array( $this, 'shortcode' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        register_activation_hook( __FILE__, array( $this, 'activate' ) );
    }

    public function activate() {
        $assets = plugin_dir_path( __FILE__ ) . 'dist/assets';
        if ( ! file_exists( $assets ) ) {
            wp_mkdir_p( $assets );
        }
    }

    public function enqueue_assets() {
        $plugin_url = plugin_dir_url( __FILE__ );
        $assets_url = $plugin_url . 'dist/assets/';

        $css_file = 'index-Ds3WH6D6.css';
        $js_file  = 'index-Da-JLo9O.js';

        $css_path = plugin_dir_path( __FILE__ ) . 'dist/assets/' . $css_file;
        $js_path  = plugin_dir_path( __FILE__ ) . 'dist/assets/' . $js_file;

        wp_enqueue_style(
            'lr100-viewer-css',
            $assets_url . $css_file,
            array(),
            file_exists( $css_path ) ? filemtime( $css_path ) : false
        );

        wp_enqueue_script(
            'lr100-viewer-js',
            $assets_url . $js_file,
            array(),
            file_exists( $js_path ) ? filemtime( $js_path ) : false,
            true
        );
        wp_script_add_data( 'lr100-viewer-js', 'type', 'module' );

        wp_localize_script( 'lr100-viewer-js', 'LR100Config', array(
            'assetsUrl' => $assets_url,
            'pluginUrl' => $plugin_url,
        ) );

        wp_add_inline_script( 'lr100-viewer-js', <<<'JS'
(function() {
    const assetsUrl = LR100Config.assetsUrl;
    const pluginUrl = LR100Config.pluginUrl;

    // 1. Override fetch to fix asset paths
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string') {
            if (url.startsWith('/assets/')) {
                return originalFetch(assetsUrl + url.slice(7), options);
            }
            if (url.includes('/length-measurement-configurator/assets/')) {
                const name = url.split('/assets/').pop();
                return originalFetch(assetsUrl + '/' + name, options);
            }
            if (url.startsWith('./assets/')) {
                return originalFetch(assetsUrl + url.slice(8), options);
            }
            const files = [
                '100-10-MOVING.gltf', '100-10-STAND.gltf',
                '100-99-MOVING.gltf', '100-99-STAND.gltf',
                '100-200-MOVING.gltf', '100-200-STAND.gltf',
                '1410.gltf', '1410C.gltf', '1410model.gltf',
                '284-SPOOL.gltf', 'LR100-284.gltf'
            ];
            for (const f of files) {
                if (url.endsWith(f)) {
                    return originalFetch(assetsUrl + '/' + f, options);
                }
            }
        }
        return originalFetch(url, options);
    };

    // 2. Override loadCombo
    window.LR100_overrideFunctions = function() {
        if (window.loadCombo) {
            const orig = window.loadCombo;
            window.loadCombo = function(fileName, onLoad) {
                if (!fileName) return;
                const correct = assetsUrl + '/' + fileName;
                if (window.loader && window.loader.load) {
                    window.loader.load(
                        correct,
                        gltf => onLoad && onLoad(gltf.scene),
                        undefined,
                        err => console.error('LR100 loadCombo error', fileName, err)
                    );
                }
            };
        }
    };

    // 3. Override Worker
    const OrigWorker = window.Worker;
    window.Worker = function(url, opts) {
        if (url instanceof URL && url.toString().includes('physicsWorker')) {
            return new OrigWorker(assetsUrl + '/physicsWorker-iiFlsN1r.js', opts);
        }
        return new OrigWorker(url, opts);
    };

    // 4. Patch THREE loaders
    const patchLoaders = () => {
        if (window.THREE) {
            // TextureLoader
            const tLoad = THREE.TextureLoader.prototype.load;
            THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                if (typeof url === 'string') {
                    if (url.startsWith('./assets/')) {
                        url = assetsUrl + '/' + url.split('/').pop();
                    } else {
                        const exts = ['.jpg','.jpeg','.png','.webp','.bmp'];
                        if (exts.some(ext => url.toLowerCase().endsWith(ext))) {
                            url = assetsUrl + '/' + url.split('/').pop();
                        }
                    }
                }
                return tLoad.call(this, url, onLoad, onProgress, onError);
            };

            // GLTFLoader
            if (THREE.GLTFLoader) {
                const gLoad = THREE.GLTFLoader.prototype.load;
                THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                    if (typeof url === 'string') {
                        if (url.startsWith('./assets/') || (url.includes('/assets/') && url.toLowerCase().endsWith('.gltf')) || url.toLowerCase().endsWith('.gltf')) {
                            url = assetsUrl + '/' + url.split('/').pop();
                        }
                    }
                    return gLoad.call(this, url, onLoad, onProgress, onError);
                };
            }

            window.LR100_overrideFunctions();
        }
    };
    const iv = setInterval(() => {
        if (window.THREE) {
            clearInterval(iv);
            patchLoaders();
        }
    }, 100);
})();
JS
        );
    }

    public function shortcode( $atts ) {
        $atts = shortcode_atts( array(
            'width'            => '100%',
            'height'           => '600px',
            'include_controls' => 'true',
        ), $atts, 'lr100_3d' );

        $id = 'lr100-container-' . uniqid();
        ob_start();
        ?>
        <div id="<?php echo esc_attr( $id ); ?>" class="lr100-container" style="width:<?php echo esc_attr( $atts['width'] ); ?>;height:<?php echo esc_attr( $atts['height'] ); ?>;">
            <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f0f0f0;">
                <p>Loading LR100 3D Viewer...</p>
            </div>
        </div>
        <?php if ( 'true' === $atts['include_controls'] ) : ?>
            <div id="top-bar">
                <!-- your control markup here -->
            </div>
            <div class="footer-text footer-left">Note: LR100-284 does not include a spool, colours may vary</div>
            <div class="footer-text footer-right">© 2025 Taymer International, Inc. All rights reserved.</div>
        <?php endif; ?>
        <?php
        return ob_get_clean();
    }
}

add_action( 'plugins_loaded', function() {
    LR100_3D_Viewer::get_instance();
} );
