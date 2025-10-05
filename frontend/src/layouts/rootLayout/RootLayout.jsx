// src/layouts/rootLayout/RootLayout.jsx
// MODIFIED FILE

import { Outlet, Link, useLocation } from "react-router-dom"; // Add useLocation
import { SignedIn, UserButton } from "@clerk/clerk-react";
import { AnimatePresence } from "framer-motion"; // Import AnimatePresence
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import PageTransition from "../../components/PageTransition/PageTransition"; // Import our new component
import "./rootLayout.css";

const RootLayout = () => {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const location = useLocation(); // Get the current location

  return (
    <div className="rootLayout">
      <header>
        {/* Your header code remains the same... */}
        <Link to="/" className="logo">
          <img src="/logo.png" alt="logo" />
          <span>spECTRA</span>
        </Link>
        <div className="user">
          <ThemeToggle />
          {hasClerk ? (
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          ) : null}
        </div>
      </header>
      <main>
        {/* This is the key change! */}
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RootLayout;