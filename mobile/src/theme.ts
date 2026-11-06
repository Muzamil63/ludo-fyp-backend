// Colours, gradients, sizes and text styles used by every screen. Change the look of the app here.

export const colors = {
  bg: '#0B1026',
  bgAlt: '#151C45',
  card: 'rgba(255,255,255,0.07)',
  cardSolid: '#1B2354',
  cardBorder: 'rgba(255,255,255,0.12)',
  input: 'rgba(255,255,255,0.08)',

  text: '#FFFFFF',
  textDim: '#B4BBE0',
  textMuted: '#7179A6',

  primary: '#7C5CFF',
  gold: '#FFC93C',
  success: '#2ECC71',
  danger: '#FF4D6D',
  warning: '#FFB020',
  info: '#45AAF2',
};

// The four Ludo colours (seat 1 red, 2 green, 3 yellow, 4 blue)
export const ludo = {
  red: { main: '#EF3B4E', light: '#FF8A96', dark: '#A81E2D' },
  green: { main: '#1FB860', light: '#7BE3A4', dark: '#0E7A3C' },
  yellow: { main: '#F8C41D', light: '#FFE27A', dark: '#B88A00' },
  blue: { main: '#2F7FF0', light: '#86B7FF', dark: '#1550A8' },
};

export type LudoColor = keyof typeof ludo;

export const gradients = {
  background: ['#23185E', '#121A4A', '#0B1026'],
  primary: ['#9B7BFF', '#6A45F5'],
  gold: ['#FFE08A', '#FFB81F'],
  danger: ['#FF7A8F', '#E8304F'],
  success: ['#5BE59A', '#1FAE5B'],
  card: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'],
  red: ['#FF6B7A', '#D9263A'],
  green: ['#4BDA88', '#14994C'],
  yellow: ['#FFD95A', '#E6A800'],
  blue: ['#5FA0FF', '#1E64D6'],
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, round: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const text = {
  hero: { fontSize: 34, fontWeight: '900' as const, color: colors.text, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '800' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  dim: { fontSize: 14, color: colors.textDim },
  small: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' as const },
};

// Emoji avatars a player can pick on the profile screen (saved in players.avatar)
export const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐨', '🐙', '🦄', '🐲', '🤖', '👑'];
