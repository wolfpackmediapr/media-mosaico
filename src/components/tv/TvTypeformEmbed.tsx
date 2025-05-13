
import TypeformEmbed from "@/components/common/TypeformEmbed";
import { useAuthStatus } from "@/hooks/use-auth-status";

const TvTypeformEmbed = () => {
  const { isAuthenticated } = useAuthStatus();
  
  return (
    <TypeformEmbed
      formId="01JEWEP95CN5YH8JCET8GEXRSK"
      title="Alerta TV"
      description="Haga clic en el botón a continuación para cargar el formulario de alerta de TV."
      isAuthenticated={isAuthenticated}
    />
  );
};

export default TvTypeformEmbed;
