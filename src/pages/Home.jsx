import { Link } from 'react-router-dom';
import JoinForm from '@/components/participant/JoinForm';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <JoinForm />
      <div className="absolute top-4 right-4">
        <Link
          to="/login"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Researcher sign in
        </Link>
      </div>
    </div>
  );
}
