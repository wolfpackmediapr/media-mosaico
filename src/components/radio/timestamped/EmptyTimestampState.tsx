
interface EmptyTimestampStateProps {
  message?: string;
}

const EmptyTimestampState = ({ message = "No hay datos de timestamps disponibles" }: EmptyTimestampStateProps) => {
  return (
    <div className="p-4 border rounded-md bg-muted/20 min-h-[200px] flex items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default EmptyTimestampState;
