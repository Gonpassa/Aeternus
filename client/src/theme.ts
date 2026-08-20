import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

const buttonRecipe = defineRecipe({
  base: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'md',
    fontFamily: 'mono',
    fontSize: 'xs',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    transitionProperty: 'background-color, border-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-out',
    outline: 'none',
    cursor: 'pointer',
    _disabled: { pointerEvents: 'none', opacity: 0.5 },
  },
  variants: {
    variant: {
      default: { bg: 'primary', color: 'primaryForeground', _hover: { bg: 'primary/90' } },
      destructive: { bg: 'destructive', color: 'paper', _hover: { bg: 'destructive/90' } },
      outline: {
        borderWidth: '1px',
        borderColor: 'primary',
        bg: 'transparent',
        color: 'primary',
        _hover: { bg: 'primary/5' },
      },
      secondary: {
        borderWidth: '1px',
        borderColor: 'primary',
        bg: 'transparent',
        color: 'primary',
        _hover: { bg: 'primary/5' },
      },
      ghost: { color: 'accent', _hover: { textDecoration: 'underline' } },
      link: {
        color: 'accent',
        textUnderlineOffset: '4px',
        _hover: { textDecoration: 'underline' },
      },
    },
    size: {
      default: { h: '9', px: '4', py: '2' },
      xs: { h: '6', gap: '1', px: '2', fontSize: 'xs' },
      sm: { h: '8', gap: '1.5', px: '3' },
      lg: { h: '10', px: '6' },
      icon: { h: '9', w: '9', px: '0' },
      'icon-xs': { h: '6', w: '6', px: '0' },
      'icon-sm': { h: '8', w: '8', px: '0' },
      'icon-lg': { h: '10', w: '10', px: '0' },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export const textRecipe = defineRecipe({
  base: {},
  variants: {
    variant: {
      default: {},
      eyebrow: {
        fontFamily: 'mono',
        fontSize: 'xs',
        textTransform: 'uppercase',
        letterSpacing: 'wide',
      },
      muted: {
        color: 'inkSoft',
      },
      error: {
        color: 'rust',
      },
      formError: {
        color: 'red.600',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export const headingRecipe = defineRecipe({
  base: {},
  variants: {
    variant: {
      default: {},
      page: {
        fontFamily: 'heading',
        fontSize: '3xl',
        fontWeight: 'semibold',
        color: 'ink',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export const inputRecipe = defineRecipe({
  base: {},
  variants: {
    variant: {
      default: {},
      title: {
        border: 'none',
        borderBottomWidth: '1px',
        borderColor: 'line',
        borderRadius: '0',
        bg: 'transparent',
        px: '0',
        pb: '2',
        fontFamily: 'heading',
        fontWeight: 'medium',
        fontSize: '2xl',
        color: 'ink',
        _focusVisible: { borderColor: 'moss', boxShadow: 'none' },
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        paper: { value: '#F3EEE2' },
        paperCard: { value: '#EAE2CC' },
        ink: { value: '#232220' },
        inkSoft: { value: '#5B564C' },
        inkBlue: { value: '#2C3E52' },
        moss: { value: '#55684A' },
        rust: { value: '#A8532F' },
        line: { value: '#D8CFB8' },
        moodAnxious: { value: '#B98A2E' },
        moodAngry: { value: '#7A2E1E' },
        moodCalm: { value: '#C9743A' },
        moodSteady: { value: '#8A7D5C' },
      },
      fonts: {
        heading: { value: "'Fraunces', ui-serif, serif" },
        body: { value: "'Newsreader', ui-serif, serif" },
        mono: { value: "'IBM Plex Mono', ui-monospace, monospace" },
      },
      radii: {
        md: { value: '4px' },
      },
    },
    semanticTokens: {
      colors: {
        primary: { value: '{colors.inkBlue}' },
        primaryForeground: { value: '{colors.paper}' },
        secondary: { value: 'transparent' },
        secondaryForeground: { value: '{colors.inkBlue}' },
        destructive: { value: '{colors.rust}' },
        accent: { value: '{colors.moss}' },
        accentForeground: { value: '{colors.paper}' },
        ring: { value: '{colors.moss}' },
        background: { value: '{colors.paperCard}' },
        border: { value: '{colors.line}' },
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
  globalCss: {
    body: {
      bg: 'paper',
      color: 'ink',
    },
    '.entry-content p': {
      marginBottom: '1em',
    },
    '.entry-content h1, .entry-content h2, .entry-content h3': {
      fontFamily: 'heading',
      marginTop: '1.5em',
      marginBottom: '0.5em',
    },
    '.entry-content ul, .entry-content ol': {
      marginBottom: '1em',
      paddingLeft: '1.5em',
    },
    '.entry-content ul': {
      listStyleType: 'disc',
    },
    '.entry-content ol': {
      listStyleType: 'decimal',
    },
  },
});

export const system = createSystem(defaultConfig, config);
