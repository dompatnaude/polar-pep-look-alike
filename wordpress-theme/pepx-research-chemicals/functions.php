<?php
/**
 * PepX Research Chemicals theme functions.
 */

function pepx_enqueue_assets() {
  $dir = get_stylesheet_directory();
  $uri = get_stylesheet_directory_uri();

  wp_enqueue_style(
    'pepx-style',
    $uri . '/assets/style.css',
    array(),
    filemtime($dir . '/assets/style.css')
  );

  wp_enqueue_script(
    'pepx-script',
    $uri . '/assets/script.js',
    array(),
    filemtime($dir . '/assets/script.js'),
    true
  );

  // Lets the storefront JS resolve theme asset paths (product images, etc.).
  wp_add_inline_script(
    'pepx-script',
    'window.PEPX_THEME_URI = ' . wp_json_encode($uri) . ';',
    'before'
  );
}
add_action('wp_enqueue_scripts', 'pepx_enqueue_assets');

add_theme_support('title-tag');
