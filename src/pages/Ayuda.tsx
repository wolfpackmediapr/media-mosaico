import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Book, Video, MessageCircle, Mail } from "lucide-react";

const Ayuda = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Centro de Ayuda</h1>
        <p className="text-gray-500 mt-2">
          Recursos y soporte para optimizar su experiencia
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Buscar en la documentación..."
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="h-5 w-5" />
              <span>Documentación</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-500">
              Explore nuestra documentación detallada sobre todas las funcionalidades
              de la plataforma.
            </p>
            <Button variant="outline" className="w-full">Ver Documentación</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Tutoriales</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-500">
              Aprenda a través de videos tutoriales paso a paso sobre el uso de
              la plataforma.
            </p>
            <Button variant="outline" className="w-full">Ver Tutoriales</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Chat de Soporte</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-500">
              Obtenga ayuda en tiempo real de nuestro equipo de soporte
              especializado.
            </p>
            <Button variant="outline" className="w-full">Iniciar Chat</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Contacto</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-500">
              Envíenos un mensaje y nuestro equipo se pondrá en contacto con
              usted.
            </p>
            <Button variant="outline" className="w-full">Contactar</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">¿Cómo configuro mi primer monitoreo?</h3>
            <p className="text-gray-500">
              Para configurar su primer monitoreo, diríjase a la sección correspondiente
              (TV, Radio o Prensa) y siga las instrucciones en pantalla.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">¿Cómo exporto mis reportes?</h3>
            <p className="text-gray-500">
              En la sección de Reportes, encontrará un botón de exportación que le
              permitirá descargar los datos en varios formatos.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">¿Cómo configuro las alertas?</h3>
            <p className="text-gray-500">
              Acceda a la sección de Alertas y utilice el botón de configuración
              para personalizar sus notificaciones.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ayuda;