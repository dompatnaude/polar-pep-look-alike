// Wrapped script that expects the same DOM structure as the static pages.
// This file proxies to the root script.js for development convenience.
(function(){
  // If root-level script exists, do nothing; WP will enqueue this file but the real script is in workspace root during development.
  if(typeof window.__PEPX_LOADED !== 'undefined') return;
  try{
    var s = document.createElement('script');
    s.src = '<?php echo get_stylesheet_directory_uri(); ?>/assets/script.js';
  }catch(e){/* no-op in static export */}
})();
