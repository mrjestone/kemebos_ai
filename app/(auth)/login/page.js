import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Kaizirege & Kemebos AI Assistant" };

export default function LoginPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-semibold tracking-tight">Sign in</h2>
      <LoginForm />
    </>
  );
}
