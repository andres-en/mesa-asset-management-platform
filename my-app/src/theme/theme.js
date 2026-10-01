import { createTheme } from '@mui/material/styles';

export function createAppTheme(mode) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      // Brand blue #1176EF. On the navy dark background it is lightened for text contrast (WCAG AA).
      primary: {
        main:         dark ? '#4C9BF5' : '#1176EF',
        dark:         '#0B5FCC',
        light:        dark ? '#8AC0FA' : '#4C9BF5',
        contrastText: dark ? '#0F172A' : '#FFFFFF',
      },
      secondary: { main: '#10A0E8', contrastText: '#ffffff' },
      background: {
        default: dark ? '#0F172A' : '#F1F5F9',
        paper:   dark ? '#1E293B' : '#ffffff',
      },
      divider: dark ? 'rgba(203,213,225,0.08)' : 'rgba(15,23,42,0.15)',
      text: {
        primary:   dark ? '#F1F5F9' : '#0F172A',
        secondary: dark ? '#CBD5E1' : '#1E293B',
        disabled:  dark ? 'rgba(241,245,249,0.38)' : 'rgba(15,23,42,0.38)',
      },
      success: {
        main:         dark ? '#4ade80' : '#16a34a',
        dark:         '#15803d',
        light:        dark ? '#bbf7d0' : '#dcfce7',
        contrastText: '#ffffff',
      },
      warning: {
        main:         '#f59e0b',
        dark:         '#d97706',
        light:        '#fde68a',
        contrastText: '#ffffff',
      },
      error: {
        main:         dark ? '#f87171' : '#ef4444',
        dark:         '#dc2626',
        light:        '#fecaca',
        contrastText: '#ffffff',
      },
      info: { main: '#10A0E8' },
    },

    typography: {
      fontFamily: '"Inter", "ui-sans-serif", system-ui, -apple-system, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, letterSpacing: '0.01em' },
    },

    shape: { borderRadius: 10 },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: dark ? '#334155 transparent' : '#CBD5E1 transparent',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: dark ? '#334155' : '#CBD5E1',
              borderRadius: 3,
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.09)' : 'rgba(15,23,42,0.14)'}`,
            boxShadow: dark ? 'none' : '0 2px 8px rgba(15,23,42,0.09), 0 0 0 1px rgba(15,23,42,0.05)',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.07)' : 'rgba(15,23,42,0.13)'}`,
            boxShadow: dark ? 'none' : '0 2px 8px rgba(15,23,42,0.08)',
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.1)' : 'rgba(15,23,42,0.18)'}`,
            boxShadow: dark
              ? '0 25px 60px rgba(0,0,0,0.4)'
              : '0 25px 60px rgba(15,23,42,0.18)',
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8, fontSize: '0.875rem' },
          containedPrimary: {
            background: 'linear-gradient(135deg, #0B5FCC 0%, #1176EF 100%)',
            color: '#FFFFFF',
            boxShadow: '0 0 0 1px rgba(17,118,239,0.3), 0 4px 16px rgba(17,118,239,0.2)',
            '&:hover': {
              background: 'linear-gradient(135deg, #094FAB 0%, #0B5FCC 100%)',
              boxShadow: '0 0 0 1px rgba(17,118,239,0.5), 0 4px 20px rgba(17,118,239,0.35)',
            },
          },
          containedWarning: {
            background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
            color: '#000',
            boxShadow: 'none',
            '&:hover': { background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)' },
          },
          outlined: {
            borderColor: dark ? 'rgba(203,213,225,0.18)' : 'rgba(15,23,42,0.3)',
            '&:hover': {
              borderColor: dark ? 'rgba(203,213,225,0.38)' : 'rgba(15,23,42,0.45)',
              backgroundColor: dark ? 'rgba(203,213,225,0.04)' : 'rgba(15,23,42,0.04)',
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? 'rgba(203,213,225,0.15)' : 'rgba(15,23,42,0.25)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? 'rgba(203,213,225,0.3)' : 'rgba(15,23,42,0.45)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1176EF', borderWidth: 1,
            },
            backgroundColor: dark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
            '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
              WebkitBoxShadow: `0 0 0 100px ${dark ? '#1E293B' : '#ffffff'} inset`,
              WebkitTextFillColor: dark ? '#F1F5F9' : '#0F172A',
              caretColor: dark ? '#F1F5F9' : '#0F172A',
              borderRadius: 'inherit',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: dark ? '#CBD5E1' : '#1E293B',
            '&.Mui-focused': { color: '#1176EF' },
          },
        },
      },

      MuiSelect: {
        styleOverrides: { icon: { color: dark ? '#CBD5E1' : '#1E293B' } },
      },

      MuiTableContainer: {
        styleOverrides: { root: { backgroundColor: 'transparent' } },
      },

      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: dark ? '#0F172A' : '#F1F5F9',
              color:           dark ? '#CBD5E1' : '#1E293B',
              fontSize:        '0.7rem',
              fontWeight:      700,
              textTransform:   'uppercase',
              letterSpacing:   '0.08em',
              borderBottom:    `1px solid ${dark ? 'rgba(203,213,225,0.07)' : 'rgba(15,23,42,0.14)'}`,
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${dark ? 'rgba(203,213,225,0.05)' : 'rgba(15,23,42,0.1)'}`,
            color:        dark ? '#CBD5E1' : '#1E293B',
            fontSize:     '0.875rem',
            padding:      '14px 16px',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': {
              backgroundColor: dark
                ? 'rgba(76,155,245,0.04) !important'
                : 'rgba(17,118,239,0.04) !important',
            },
            '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.02em', height: 24, borderRadius: 6 },
          colorSuccess: {
            backgroundColor: dark ? 'rgba(74,222,128,0.12)' : 'rgba(22,163,74,0.1)',
            color:           dark ? '#4ade80' : '#16a34a',
            border:          `1px solid ${dark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.25)'}`,
          },
          colorWarning: {
            backgroundColor: dark ? 'rgba(251,191,36,0.12)' : 'rgba(245,158,11,0.1)',
            color:           dark ? '#fbbf24' : '#d97706',
            border:          `1px solid ${dark ? 'rgba(251,191,36,0.2)' : 'rgba(245,158,11,0.25)'}`,
          },
          colorError: {
            backgroundColor: dark ? 'rgba(248,113,113,0.12)' : 'rgba(239,68,68,0.1)',
            color:           dark ? '#f87171' : '#dc2626',
            border:          `1px solid ${dark ? 'rgba(248,113,113,0.2)' : 'rgba(239,68,68,0.25)'}`,
          },
          colorDefault: {
            backgroundColor: dark ? 'rgba(203,213,225,0.08)' : 'rgba(15,23,42,0.07)',
            color:           dark ? '#CBD5E1' : '#1E293B',
            border:          `1px solid ${dark ? 'rgba(203,213,225,0.12)' : 'rgba(15,23,42,0.15)'}`,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            borderRight: `1px solid ${dark ? 'rgba(203,213,225,0.06)' : 'rgba(15,23,42,0.14)'}`,
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: dark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.9)',
            backdropFilter:  'blur(12px)',
            borderBottom:    `1px solid ${dark ? 'rgba(203,213,225,0.07)' : 'rgba(15,23,42,0.12)'}`,
            boxShadow:       'none',
            color:           dark ? '#F1F5F9' : '#0F172A',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.1)' : 'rgba(15,23,42,0.15)'}`,
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(15,23,42,0.14)',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: dark ? 'rgba(76,155,245,0.06)' : 'rgba(17,118,239,0.06)',
            },
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#0F172A',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.1)' : 'rgba(255,255,255,0.1)'}`,
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#F1F5F9',
          },
          arrow: { color: '#0F172A' },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: dark ? 'rgba(203,213,225,0.07)' : 'rgba(15,23,42,0.14)' },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, fontSize: '0.875rem' },
          standardError: {
            backgroundColor: dark ? 'rgba(248,113,113,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${dark ? 'rgba(248,113,113,0.2)' : 'rgba(239,68,68,0.22)'}`,
            color: dark ? '#fca5a5' : '#dc2626',
          },
          standardSuccess: {
            backgroundColor: dark ? 'rgba(74,222,128,0.08)' : 'rgba(22,163,74,0.08)',
            border: `1px solid ${dark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.2)'}`,
            color: dark ? '#86efac' : '#15803d',
          },
          standardWarning: {
            backgroundColor: dark ? 'rgba(251,191,36,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${dark ? 'rgba(251,191,36,0.2)' : 'rgba(245,158,11,0.2)'}`,
          },
        },
      },

      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: dark ? '#1E293B' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(203,213,225,0.1)' : 'rgba(15,23,42,0.15)'}`,
          },
          option: {
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: dark ? 'rgba(76,155,245,0.06)' : 'rgba(17,118,239,0.06)',
            },
          },
        },
      },
    },
  });
}
