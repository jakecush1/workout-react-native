import { AuthForm } from "../components/AuthForm";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { signUp } = useAuth();
  return <AuthForm mode="register" onSubmit={({ name, email, password }) => signUp(name, email, password)} />;
}
