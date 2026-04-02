/**
 * Generate the style.css file with WordPress theme metadata header.
 */
export function generateStyleCss(
  themeName: string,
  description: string,
  slug: string,
): string {
  const safeName = sanitizeForCss(themeName);
  const safeDescription = sanitizeForCss(description);

  return `/*
Theme Name: ${safeName}
Theme URI: https://github.com/your-repo/${slug}
Author: AI Theme Generator
Author URI: https://wp-block-theme-generator-production.up.railway.app
Description: ${safeDescription}
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${slug}
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 7.4
*/
`;
}

function sanitizeForCss(str: string): string {
  // Remove characters that could break CSS comment syntax
  return str.replace(/\*\//g, '').replace(/\/\*/g, '').trim();
}
