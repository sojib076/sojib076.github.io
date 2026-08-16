'use client';

import { createTheme } from '@mui/material/styles';

/**
 * A neighbourhood-shop look, not a marketplace look.
 *
 * The palette is built around the deep green of a Bangladeshi grocery signboard
 * with a warm amber for offers. Everything is tuned for a small phone screen
 * held in one hand: large tap targets, high contrast, no thin grey text.
 *
 * Fonts come from the device. Bengali product names must render correctly on a
 * ৳8,000 Android phone, and downloading a webfont over a slow connection to
 * achieve that is a bad trade.
 */

const fontStack = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Noto Sans Bengali"',
  '"Hind Siliguri"',
  '"Kalpurush"',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: '#0F7B4F',
      dark: '#0A5C3A',
      light: '#E3F3EA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E8871E',
      dark: '#C26E12',
      light: '#FDF1E2',
      contrastText: '#FFFFFF',
    },
    success: { main: '#1B8A5A' },
    warning: { main: '#B8860B' },
    error: { main: '#C62828' },
    background: {
      default: '#F7F8F6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#16241D',
      secondary: '#54655C',
    },
    divider: '#E3E8E4',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: fontStack,
    h1: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.35 },
    h4: { fontSize: '1rem', fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Stops iOS Safari from zooming when a checkout field is focused.
        'input, select, textarea': { fontSize: '16px' },
        body: { WebkitTapHighlightColor: 'transparent' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 44 },
        sizeSmall: { minHeight: 36 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #E3E8E4', boxShadow: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
    },
    MuiContainer: {
      defaultProps: { maxWidth: 'lg' },
    },
  },
});

export default theme;
