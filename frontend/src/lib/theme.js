/**
 * Smooth, flicker-free theme switching utility.
 * 
 * Prevents competing CSS transitions across the DOM tree during theme toggling
 * by temporarily disabling transitions, executing the root class mutation,
 * forcing a browser reflow, and removing the override.
 */

export function setThemeCleanly(isDark) {
  if (typeof document === 'undefined') return;

  // 1. Inject temporary global style block disabling all transitions
  const css = document.createElement('style');
  css.setAttribute('data-theme-transition-suppressor', 'true');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  // 2. Trigger class swap on the root element and persist preference
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }

  // 3. Force a reflow so the new computed styles apply immediately without transitions
  const _ = window.getComputedStyle(css).opacity;

  // 4. Remove the temporary style block
  if (css.parentNode) {
    css.parentNode.removeChild(css);
  }
}
