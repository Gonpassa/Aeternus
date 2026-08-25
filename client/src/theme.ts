import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

const buttonRecipe = defineRecipe({
  base: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    borderRadius: 'md',
    textStyle: 'button',
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
      ghost: { color: 'accent', _hover: { textDecoration: 'underline' } },
      link: {
        color: 'accent',
        textUnderlineOffset: '4px',
        _hover: { textDecoration: 'underline' },
      },
    },
    size: {
      default: { h: '9', px: '4', py: '2', textStyle: 'button' },
      xs: { h: '6', gap: '1', px: '2', textStyle: 'button' },
      sm: { h: '8', gap: '1.5', px: '3', textStyle: 'button' },
      lg: { h: '10', px: '6', textStyle: 'button' },
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
        textStyle: 'label',
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
        textStyle: 'pageTitle',
        color: 'ink',
      },
      section: {
        textStyle: 'sectionHeading',
        color: 'ink',
      },
      card: {
        textStyle: 'cardTitle',
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
        moodAnxious: { value: '#5C4A72' },
        moodAngry: { value: '#7A2E1E' },
        moodCalm: { value: '#C9743A' },
        moodSteady: { value: '#B8860B' },
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
    textStyles: {
      pageTitle: {
        value: {
          fontFamily: 'heading',
          fontSize: '2.25rem',
          fontWeight: '600',
          lineHeight: '1.15',
        },
      },
      sectionHeading: {
        value: { fontFamily: 'heading', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.25' },
      },
      cardTitle: {
        value: {
          fontFamily: 'heading',
          fontSize: '1.125rem',
          fontWeight: '500',
          lineHeight: '1.3',
        },
      },
      body: {
        value: { fontFamily: 'body', fontSize: '1.0625rem', fontWeight: '400', lineHeight: '1.6' },
      },
      button: {
        value: {
          fontFamily: 'mono',
          fontSize: '0.8125rem',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
      label: {
        value: {
          fontFamily: 'mono',
          fontSize: '0.75rem',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
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
    '.entry-content em': {
      fontStyle: 'italic',
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
