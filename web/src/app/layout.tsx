//The root layout for your whole site. Renders once and wraps every page. 
// Put site-wide UI here: <nav>, header, footer, global providers, fonts. 
// If you change it, the entire app's chrome (nav/header/footer) changes everywhere.

//imports
import "./globals.css";
import { Metadata } from "next";

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
            
            <div className="nav__menu" id="nav-menu">
              <ul className="nav__list">
                <li className="nav__item">
                  <a href="/" className="nav__link">Home</a>
                </li>
                <li className="nav__item">
                  <a href="/dashboard" className="nav__link">Dashboard</a>
                </li>
                <li className="nav__item">
                  <a href="/profile" className="nav__link">Profile</a>
                </li>
              </ul>
            </div>

            <div className="nav__actions">
              <a href="/login" className="nav__login">Login</a>
              <i className="nav__toggle" id="nav-toggle">☰</i>
            </div>
          </nav>
        </header>
        {children}
        </div>
      </body>
    </html>
  )
}