import SignUpForm from "@/components/SignUpForm";

const signUpPage = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-center">
        <SignUpForm showSignInLink />
      </div>
    </section>
  );
};

export default signUpPage;
