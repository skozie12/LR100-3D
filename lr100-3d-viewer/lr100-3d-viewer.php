<?php
/*
Plugin Name: LR100 3D Viewer
Description: Embeds the LR100 3D build you compiled into WordPress.
Version:     1.0
Author:      Duncan Smith
*/

defined('ABSPATH') or die('No script kiddies please!');

function lr100_enqueue_3d_assets() {
  // adjust filenames to match your build output
  wp_enqueue_script(
    'lr100-3d-app',
    plugins_url('dist/assets/main.js', __FILE__),
    [],          // dependencies, e.g. ['three']
    null,
    true         // in footer
  );
  wp_enqueue_style(
    'lr100-3d-style',
    plugins_url('dist/assets/main.css', __FILE__)
  );
}
add_action('wp_enqueue_scripts', 'lr100_enqueue_3d_assets');

function lr100_3d_shortcode($atts) {
  // the element your app mounts into
  return '<div id="lr100-3d-root"></div>';
}
add_shortcode('lr100_3d', 'lr100_3d_shortcode');