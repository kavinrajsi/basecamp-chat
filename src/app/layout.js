import "./globals.css";

export const metadata = {
  title: "Basecamp Viewer",
  description: "View and manage your Basecamp projects",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
