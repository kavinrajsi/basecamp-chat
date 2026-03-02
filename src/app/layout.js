import "./globals.css";
import SWRegister from "@/components/SWRegister";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = {
  title: "Basecamp Viewer",
  description: "View and manage your Basecamp projects",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Basecamp Viewer",
  },
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
        <SWRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
