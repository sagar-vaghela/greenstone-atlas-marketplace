import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import "./style.css";
import { theme } from "./theme";
import { App } from "./App";
import { store } from "./app/store";
import { ProductionErrorBoundary } from "./components/common/ProductionErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ProductionErrorBoundary>
          <App />
        </ProductionErrorBoundary>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
