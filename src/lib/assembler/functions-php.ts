/**
 * Generate a minimal functions.php for the block theme.
 * Handles pattern registration and basic theme setup.
 */
export function generateFunctionsPhp(slug: string): string {
  const safeSlug = sanitizeSlug(slug);

  return `<?php
/**
 * Theme functions and definitions.
 *
 * @package ${safeSlug}
 */

if ( ! defined( 'ABSPATH' ) ) {
\texit;
}

/**
 * Enqueue theme styles.
 */
function ${safeSlug.replace(/-/g, '_')}_setup() {
\tadd_theme_support( 'wp-block-styles' );
\tadd_theme_support( 'editor-styles' );
}
add_action( 'after_setup_theme', '${safeSlug.replace(/-/g, '_')}_setup' );

/**
 * Register block pattern categories.
 */
function ${safeSlug.replace(/-/g, '_')}_register_pattern_categories() {
\tregister_block_pattern_category( 'featured', array(
\t\t'label' => __( 'Featured', '${safeSlug}' ),
\t) );
\tregister_block_pattern_category( 'cta', array(
\t\t'label' => __( 'Call to Action', '${safeSlug}' ),
\t) );
}
add_action( 'init', '${safeSlug.replace(/-/g, '_')}_register_pattern_categories' );
`;
}

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/g, '');
}
