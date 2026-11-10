import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  return <AuthForm mode="login" onSubmit={({ email, password }) => signIn(email, password)} />;
}
