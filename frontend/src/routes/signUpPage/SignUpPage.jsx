import { SignUp } from "@clerk/clerk-react";
import "./signUpPage.css";
import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { dark } from "@clerk/themes";

const SignUpPage = () => {
  const { theme } = useContext(ThemeContext);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  
  if (!hasClerk) {
    return <div className="signUpPage">Authentication is not configured.</div>;
  }
  
  return (
    <div className="signUpPage">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
        }}
      />
    </div>
  );
};

export default SignUpPage;