import { SignUp } from '@clerk/clerk-react';
// You DO need to import your CSS file
import './signUpPage.css';

const SignUpPage = () => { // Corrected component name to start with uppercase "S"
  return (
    <div className='signUpPage'>
      <SignUp 
        path="/sign-up" 
        signInUrl="/sign-in" 
        fallbackRedirectUrl="/dashboard" 
      />
    </div>
  );
};

export default SignUpPage; // Also corrected the export name