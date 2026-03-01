import "./globals.css";
import SWRegister from "@/components/SWRegister";

export const metadata = {
  title: "Basecamp Viewer",
  description: "View and manage your Basecamp projects",
  manifest: "/manifest.json",
  themeColor: "#111827",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Basecamp Viewer",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
