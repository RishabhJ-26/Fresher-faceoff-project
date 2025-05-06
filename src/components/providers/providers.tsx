"use client";

import * as React from "react";

// If you have a ThemeProvider or other global providers, add them here.
// For now, it's a simple wrapper.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
