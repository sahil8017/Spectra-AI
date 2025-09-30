import { Outlet, useNavigate, Link } from "react-router-dom";
import "./rootLayout.css";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const AppShell = ({ hasClerk }) => {
  return (
    <div className="rootLayout">
      <header>
        <Link to="/" className="logo">
          <img src="/logo.png" alt="logo" />
          <span>YouLearn</span>
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
};

const RootLayout = () => {
  const navigate = useNavigate();
  const hasClerk = Boolean(PUBLISHABLE_KEY);

  if (hasClerk) {
    return (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        appearance={{ baseTheme: dark }}
      >
        <AppShell hasClerk />
      </ClerkProvider>
    );
  }

  return <AppShell hasClerk={false} />;
};

export default RootLayout;
