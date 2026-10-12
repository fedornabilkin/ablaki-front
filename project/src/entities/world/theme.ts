import type { ButtonProps, ModalProps } from 'naive-ui';
import { colors } from '@/theme/tokens';

// Apply explicitly to commands and previews, so navigation and other pages keep their theme.
export const worldActionButtonTheme: NonNullable<ButtonProps['themeOverrides']> = {
  color: 'var(--primary)', colorHover: 'var(--primary-press)', colorPressed: 'var(--primary-press)', colorFocus: 'var(--primary)',
  textColor: colors['text-on-acc'], textColorHover: colors['text-on-acc'], textColorPressed: colors['text-on-acc'], textColorFocus: colors['text-on-acc'],
  border: '1px solid var(--primary)', borderHover: '1px solid var(--primary-press)', borderPressed: '1px solid var(--primary-press)', borderFocus: '1px solid var(--primary)',
  colorDisabled: colors['bg-surface-2'], textColorDisabled: colors['text-muted'], borderDisabled: `1px solid ${colors.border}`, opacityDisabled: '0.65',
  ...Object.fromEntries(['Primary', 'Info', 'Success', 'Warning', 'Error'].flatMap(type => [
    [`color${type}`, 'var(--primary)'], [`colorHover${type}`, 'var(--primary-press)'], [`colorPressed${type}`, 'var(--primary-press)'], [`colorFocus${type}`, 'var(--primary)'],
    [`textColor${type}`, colors['text-on-acc']], [`textColorHover${type}`, colors['text-on-acc']], [`textColorPressed${type}`, colors['text-on-acc']], [`textColorFocus${type}`, colors['text-on-acc']],
    [`border${type}`, '1px solid var(--primary)'], [`borderHover${type}`, '1px solid var(--primary-press)'], [`borderPressed${type}`, '1px solid var(--primary-press)'], [`borderFocus${type}`, '1px solid var(--primary)'],
    [`colorDisabled${type}`, colors['bg-surface-2']], [`textColorDisabled${type}`, colors['text-muted']], [`borderDisabled${type}`, `1px solid ${colors.border}`],
  ])),
};

export const worldModalTheme: NonNullable<ModalProps['themeOverrides']> = {
  peers: {
    Card: { closeIconColor: colors.primary, closeIconColorHover: colors['primary-hover'], closeColorHover: colors['primary-soft'] },
  },
};
