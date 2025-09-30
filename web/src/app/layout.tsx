//The root layout for your whole site. Renders once and wraps every page. 
// Put site-wide UI here: <nav>, header, footer, global providers, fonts. 
// If you change it, the entire app's chrome (nav/header/footer) changes everywhere.

//imports
import "./globals.css";
import { Metadata } from "next";
import NavLinks from "./components/NavLinks";

export const metadata: Metadata = {
  title: "Awqaf Tracker",
  description: "Awqaf Tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="body">
        <div className="container">
        <header className="header">
          <nav className="nav">
            <a href="/" className="nav__logo">Awqaf Tracker</a>
            <NavLinks />
          </nav>
        </header>
        {children}
        </div>
      </body>
    </html>
  )
}