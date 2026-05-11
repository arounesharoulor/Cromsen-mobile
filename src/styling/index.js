import COLORS_JSON from './theme.json';

const CR_APP_THEME = COLORS_JSON;

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const FONTS = {
  bold: '700',
  semiBold: '600',
  medium: '500',
  regular: '400',
  family: 'Plus Jakarta Sans',
};

export { CR_APP_THEME, CR_APP_THEME as THEME_COLORS, CR_APP_THEME as COLORS, SPACING, FONTS };
export default CR_APP_THEME;
