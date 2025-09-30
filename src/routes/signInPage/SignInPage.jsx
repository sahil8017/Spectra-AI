import { SignIn } from "@clerk/clerk-react";
import { SignIn } from "@clerk/clerk-react";
import "./signInPage.css";

const SignInPage = () => {
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
      />
    </div>
  );
};

export default SignInPage;
