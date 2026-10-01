import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#183b3b",
      light: "#2f5b58",
      dark: "#102c2c",
      contrastText: "#fffdf8",
    },
    secondary: {
      main: "#b08a4a",
      light: "#d0ad70",
      dark: "#765a2e",
      contrastText: "#fffdf8",
    },
    background: {
      default: "#f7f5f0",
      paper: "#fffdf8",
    },
    text: {
      primary: "#1e2928",
      secondary: "#64706c",
    },
    divider: "rgba(30, 41, 40, 0.13)",
    success: {
      main: "#3f765c",
    },
    warning: {
      main: "#ad752d",
    },
    error: {
      main: "#a94c43",
    },
  },
  typography: {
    fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif',
    h1: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: "2.75rem",
      fontWeight: 400,
      lineHeight: 1.08,
      letterSpacing: 0,
    },
    h2: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400,
      letterSpacing: 0,
    },
    h3: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400,
      letterSpacing: 0,
    },
    h4: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 400,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 600,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 600,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          backgroundColor: "#f7f5f0",
        },
        "*:focus-visible": {
          outline: "3px solid #d0ad70",
          outlineOffset: 2,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "0 4px 18px rgba(30, 41, 40, 0.06)",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: { fontSize: "2rem" },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          minHeight: 42,
          textTransform: "none",
          letterSpacing: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
