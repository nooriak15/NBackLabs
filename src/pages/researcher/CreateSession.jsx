import SessionForm from '@/components/researcher/SessionForm';

export default function CreateSession() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create New Session</h1>
        <p className="text-muted-foreground mt-1">Configure your N-back experiment</p>
      </div>
      <SessionForm />
    </div>
  );
}