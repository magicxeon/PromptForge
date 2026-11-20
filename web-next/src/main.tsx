import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "./app/i18n";
import "./styles/workspace.css";
import { ActorProvider } from "./lib/canonical";
import { App } from "./app/App";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1 } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ActorProvider>
          <App />
        </ActorProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
