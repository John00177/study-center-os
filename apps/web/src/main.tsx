import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";

if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying a 4xx (permission denied, plan-locked, not found, ...) just
      // delays the UI from reflecting reality — only transient/server errors
      // are worth the default 3 retries. Duck-typed rather than
      // `instanceof AxiosError`: Vite's dev module graph can end up with two
      // separate axios instances, making `instanceof` unreliable.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
        if (typeof status === "number" && status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
