// src/routes/signInPage/SignInPage.jsx (UPDATED)

import { SignIn } from "@clerk/clerk-react";
// import "./signInPage.css"; <-- DELETE THIS LINE
import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { dark } from "@clerk/themes";

const SignInPage = () => {
  const { theme } = useContext(ThemeContext);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    // You can also style this fallback state with Bootstrap
    return <div className="d-flex justify-content-center align-items-center vh-100">Authentication is not configured.</div>;
  }

  return (
    // Use Bootstrap utility classes for layout
    // vh-100 makes the div take up the full viewport height
    <div className="d-flex justify-content-center align-items-center vh-100">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
        }}
      />
    </div>
  );
};

export default SignInPage;