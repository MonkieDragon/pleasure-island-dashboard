import { createTheme } from "@mui/material/styles";

const sansStack =
  'var(--font-ibm-plex-sans), system-ui, -apple-system, "Segoe UI", sans-serif';
const displayStack =
  'var(--font-space-grotesk), var(--font-ibm-plex-sans), system-ui, sans-serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
    background: {
      default: "#f6f7fb",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: sansStack,
    h1: { fontFamily: displayStack },
    h2: { fontFamily: displayStack },
    h3: { fontFamily: displayStack },
    h4: { fontFamily: displayStack },
    h5: { fontFamily: displayStack },
    h6: { fontFamily: displayStack },
    subtitle1: { fontFamily: displayStack },
    subtitle2: { fontFamily: displayStack },
  },
  shape: { borderRadius: 10 },
});
