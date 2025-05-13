
import TypeformEmbed from "@/components/common/TypeformEmbed";

interface TypeformAlertProps {
  isAuthenticated: boolean | null;
}

const TypeformAlert = ({ isAuthenticated }: TypeformAlertProps) => {
  return (
    <TypeformEmbed
      formId="01JEWES3GA7PPQN2SPRNHSVHPG"
      title="Alerta Radio"
      description="Haga clic en el botón a continuación para cargar el formulario de alerta de radio."
      isAuthenticated={isAuthenticated}
    />
  );
};

export default TypeformAlert;
