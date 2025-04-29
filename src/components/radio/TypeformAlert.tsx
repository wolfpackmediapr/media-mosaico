
import { useTypeform } from "@/hooks/use-typeform";

interface TypeformAlertProps {
  isAuthenticated: boolean | null;
}

const TypeformAlert = ({ isAuthenticated }: TypeformAlertProps) => {
  useTypeform(isAuthenticated === true);
  
  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta Radio</h2>
      <div data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
    </div>
  );
};

export default TypeformAlert;
