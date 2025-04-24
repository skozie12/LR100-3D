<?php
/*
Plugin Name: LR100 3D Viewer
Description: Embeds the LR100 3D build you compiled into WordPress.
Version:     1.0
Author:      Duncan Smith
*/

defined('ABSPATH') or die('No script kiddies please!');

function lr100_enqueue_3d_assets() {
  // Add patch script first to modify Web Worker behavior
  wp_enqueue_script(
    'lr100-3d-worker-patch',
    '',  // Inline script, no URL
    [],
    null,
    false
  );
  
  // Add the inline patch script that will fix the worker path
  wp_add_inline_script(
    'lr100-3d-worker-patch',
    'window.physicsWorkerPath = "' . plugins_url('dist/assets/physicsWorker-iiFlsN1r.js', __FILE__) . '";
    // Override Worker constructor for our specific worker
    const OriginalWorker = window.Worker;
    window.Worker = function(url, options) {
      // Check if this is our physics worker
      if (url && url.href && url.href.includes("physicsWorker-iiFlsN1r.js")) {
        // Use our WordPress path instead
        return new OriginalWorker(window.physicsWorkerPath, options);
      }
      // Otherwise use the original behavior
      return new OriginalWorker(url, options);
    };'
  );
  
  // Enqueue the main script as a module
  wp_enqueue_script(
    'lr100-3d-app',
    plugins_url('dist/assets/index-Da-JLo9O.js', __FILE__),
    ['lr100-3d-worker-patch'],
    null,
    true         
  );
  wp_script_add_data('lr100-3d-app', 'type', 'module');
  
  wp_enqueue_style(
    'lr100-3d-style',
    plugins_url('dist/assets/index-Ds3WH6D6.css', __FILE__)
  );
}
add_action('wp_enqueue_scripts', 'lr100_enqueue_3d_assets');

function lr100_3d_shortcode($atts) {
  return '<div id="lr100-3d-root"></div>';
}
add_shortcode('lr100_3d', 'lr100_3d_shortcode');