import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { SessionForm } from '@/components/SessionForm';
import { LogSessionHeader } from '@/components/LogSessionHeader';

export default function SessionEdit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LogSessionHeader />

      <main className="container mx-auto px-4 py-8">
        <SessionForm sessionId={id} />
      </main>
    </div>
  );
}
