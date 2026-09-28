import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  CssBaseline,
  Container,
  ThemeProvider,
  Typography,
} from "@mui/material";
import "./style.css";
import { theme } from "./theme";

function App() {
  return (
    <Container component="main" maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h1">Atlas Marketplace</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Frontend foundation ready.
      </Typography>
    </Container>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
