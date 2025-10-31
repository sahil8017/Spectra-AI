// src/routes/signInPage/SignInPage.jsx

import { SignIn } from "@clerk/clerk-react";
import "./signInPage.css"; // ✅ Added back this line
import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { dark } from "@clerk/themes";

const SignInPage = () => {
  const { theme } = useContext(ThemeContext);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    return <div className="signInPage">Authentication is not configured.</div>;
  }

  return (
    <div className="signInPage">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          baseTheme: theme === "dark" ? dark : undefined,
        }}
      />
    </div>
  );
};

export default SignInPage;
