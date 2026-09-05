import type { GlobalThemeOverrides } from 'naive-ui';

// Single palette for Naive UI and application CSS. Keep semantic names in components.
export const colors = {
  'bg-base': '#121212', 'bg-surface': '#1c1c1c', 'bg-surface-2': '#242424',
  border: '#363636', primary: '#ff7a00', 'primary-hover': '#ff9433',
  'primary-press': '#e66e00', 'primary-soft': 'rgba(255, 122, 0, 0.14)',
  text: '#e8e8e8', 'text-muted': '#aaaaaa', 'text-on-acc': '#1a1200',
  success: '#ff9433', warning: '#ffbd80', error: '#ff7a00',
} as const;

export function applyThemeTokens() {
  Object.entries(colors).forEach(([name, value]) => document.documentElement.style.setProperty(`--${name}`, value));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors['bg-base']);
}

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: colors.primary, primaryColorHover: colors['primary-hover'],
    primaryColorPressed: colors['primary-press'], primaryColorSuppl: colors['primary-hover'],
    infoColor: colors.primary, successColor: colors.success,
    warningColor: colors.warning, errorColor: colors.error,
    bodyColor: colors['bg-base'], cardColor: colors['bg-surface'],
    modalColor: colors['bg-surface'], popoverColor: colors['bg-surface-2'],
    borderColor: colors.border, textColorBase: colors.text,
    textColor1: colors.text, textColor2: colors.text, textColor3: colors['text-muted'],
    borderRadius: '10px', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  },
  Button: { heightMedium: '44px', textColorPrimary: colors['text-on-acc'], textColorHoverPrimary: colors['text-on-acc'] },
  Input: { heightMedium: '44px' },
};
