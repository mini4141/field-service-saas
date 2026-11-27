import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = { title: "Field Service" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
