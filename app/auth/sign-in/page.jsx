import SignInForm from "@/components/SignInForm";

const signInPage = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-center">
        <SignInForm showSignUpLink />
      </div>
    </section>
  );
};

export default signInPage;
