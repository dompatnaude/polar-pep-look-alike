<?php
// Enqueue theme styles and scripts
function pepx_enqueue_assets(){
  $uri = get_stylesheet_directory_uri() . '/assets';
  wp_enqueue_style('pepx-style', $uri . '/style.css', array(), filemtime(get_stylesheet_directory() . '/assets/style.css'));
  wp_enqueue_script('pepx-script', $uri . '/script.js', array(), filemtime(get_stylesheet_directory() . '/assets/script.js'), true);
}
add_action('wp_enqueue_scripts', 'pepx_enqueue_assets');

// Add support for title tag
add_theme_support('title-tag');
