import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-6">
          <Brain className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">This page doesn't exist</p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}