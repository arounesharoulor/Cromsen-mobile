import { registerRootComponent } from 'expo';

// HARDCODED THEME TO BYPASS ALL IMPORT ISSUES
const THEME = {
  primary: '#004694',
  secondary: '#004694',
  cartBtn: '#FCD7CF',
  darkNavy: '#0C1821',
  background: '#EFF1F3',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#4F4F4F',
  border: '#E0E0E0',
  error: '#FF3B30',
  success: '#34C759',
};

global.CR_APP_THEME = THEME;
global.THEME_COLORS = THEME;
global.APP_COLORS = THEME;
global.COLORS = THEME;
global.SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
global.FONTS = { bold: '700', semiBold: '600', medium: '500', regular: '400' };

import App from './App';
registerRootComponent(App);
