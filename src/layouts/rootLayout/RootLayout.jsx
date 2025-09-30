import { Link, Outlet, useNavigate } from "react-router-dom";
import "./rootLayout.css";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const RootLayout = () => {
  const navigate = useNavigate();
  const hasClerk = Boolean(PUBLISHABLE_KEY);

  const content = (
    <div className="rootLayout">
      <header>
        <Link to="/" className="logo">
          <img src="/logo.png" alt="logo" />
          <span>LAMA AI</span>
        </Link>
        <div className="user">
          {hasClerk ? (
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          ) : null}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );

  if (hasClerk) {
    return (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        appearance={{ baseTheme: dark }}
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
};

export default RootLayout;
