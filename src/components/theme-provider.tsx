"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

function ThemeBodyClassProvider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
  
    React.useEffect(() => {
      const body = document.body;
      if (resolvedTheme === 'glass') {
        body.classList.add('animated-gradient-bg');
      } else {
        body.classList.remove('animated-gradient-bg');
      }
    }, [resolvedTheme]);
  
    return <>{children}</>;
}


export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
        <ThemeBodyClassProvider>
            {children}
        </ThemeBodyClassProvider>
    </NextThemesProvider>
  )
}
