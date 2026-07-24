/**
 * Applies the stored theme before first paint.
 *
 * This MUST stay inline and synchronous in <head>. Anything async — a
 * useEffect, a deferred script — paints the default theme first and then
 * corrects it, which is the white-flash-on-a-dark-site bug. It runs before the
 * body exists, so it can only touch documentElement.
 *
 * Deliberately tiny and dependency-free; it is on the critical path.
 *
 * Storage contract, shared with ThemeToggle:
 *   localStorage.theme = 'light' | 'dark' | absent (absent = follow the OS)
 */
export const THEME_STORAGE_KEY = 'theme';

const script = `
(function(){
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.add('js');
  } catch (e) {
    // Private mode can throw on localStorage. Fall back to the OS preference
    // rather than losing the 'js' class, which the reveal system depends on.
    try {
      document.documentElement.classList.toggle('dark', matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e2) {}
    document.documentElement.classList.add('js');
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
