import "./globals.css";
import SWCleanup from "@/components/SWCleanup";

export const metadata = {
  title: "Basecamp Viewer",
  description: "View and manage your Basecamp projects",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SWCleanup />
      </body>
    </html>
  );
}
