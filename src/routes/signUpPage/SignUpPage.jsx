import { SignUp } from "@clerk/clerk-react";
import { SignUp } from "@clerk/clerk-react";
import "./signUpPage.css";

const SignUpPage = () => {
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    return <div className="signUpPage">Authentication is not configured.</div>;
  }

  return (
    <div className="signUpPage">
      <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export default SignUpPage;
