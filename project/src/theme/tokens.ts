import type { GlobalThemeOverrides } from 'naive-ui';

// Single palette for Naive UI and application CSS. Keep semantic names in components.
export const colors = {
  'bg-base': '#121212', 'bg-surface': '#1c1c1c', 'bg-surface-2': '#242424',
  border: '#2e2e2e', primary: '#ff7a00', 'primary-hover': '#ff9433',
  'input-border': '#626262',
  'primary-press': '#e66e00', 'primary-soft': 'rgba(255, 122, 0, 0.14)',
  text: '#e8e8e8', 'text-muted': '#9a9a9a', 'text-on-acc': '#1a1200',
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
    borderRadius: '.5rem', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
    fontSize: '.875rem', fontSizeSmall: '.875rem', fontSizeMedium: '.875rem', fontSizeLarge: '1rem',
  },
  Button: {
    heightSmall: '2.75rem', heightMedium: '2.75rem', heightLarge: '3rem',
    borderRadiusSmall: '.375rem', borderRadiusMedium: '.375rem', borderRadiusLarge: '.375rem',
    textColorPrimary: colors['text-on-acc'], textColorHoverPrimary: colors['text-on-acc'],
    textColorPressedPrimary: colors['text-on-acc'], textColorFocusPrimary: colors['text-on-acc'],
  },
  Input: { heightSmall: '2.75rem', heightMedium: '2.75rem', heightLarge: '3rem', color: colors['bg-base'], colorFocus: colors['bg-base'], border: `1px solid ${colors['input-border']}`, borderHover: `1px solid ${colors.primary}`, borderFocus: `1px solid ${colors.primary}`, placeholderColor: '#ababab', fontSizeSmall: '1rem', fontSizeMedium: '1rem', fontSizeLarge: '1rem' },
  InternalSelection: { heightSmall: '2.75rem', heightMedium: '2.75rem', heightLarge: '3rem' },
  Card: { paddingSmall: '1rem', paddingMedium: '1rem', paddingLarge: '1.25rem', borderRadius: '.5rem', closeSize: '2.75rem' },
  Drawer: { closeSize: '2.75rem' },
  Dialog: { padding: '1.25rem', closeSize: '2.75rem' },
  Pagination: { itemSizeSmall: '2.75rem', itemSizeMedium: '2.75rem', itemSizeLarge: '2.75rem' },
};
