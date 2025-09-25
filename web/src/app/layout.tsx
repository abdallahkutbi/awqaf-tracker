export const metadata = { title: "Awqaf Tracker" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 20 }}>
        <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <a href="/">Home</a>
          <a href="/donate">Donate</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
