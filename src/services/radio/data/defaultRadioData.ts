
import { StationType } from "../types";

export const CURRENT_RADIO_DATA_VERSION = '1.0';

// Default radio stations data
export const defaultRadioStationsData: Omit<StationType, 'id'>[] = [
  {
    name: 'WKAQ',
    code: 'WKAQ'
  },
  {
    name: 'Radio Isla',
    code: 'RADIO_ISLA'
  },
  {
    name: 'NotiUno',
    code: 'NOTIUNO'
  }
];

// Radio programs data for WKAQ
export const wkaqPrograms = [
  { name: 'Temprano en la Mañana Primera', host: 'Veronique Abreu', start_time: '05:30', end_time: '06:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Temprano en la Mañana', host: 'Rubén Sánchez', start_time: '05:30', end_time: '08:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'WKAQ Analiza', host: 'Luis Pabón Roca y Carlos Díaz Olivo', start_time: '08:30', end_time: '10:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Quebrar o No Quebrar', host: '', start_time: '09:00', end_time: '10:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Cooperativismo, Mostrando el Camino', host: '', start_time: '10:00', end_time: '11:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Tu Dinero Seguro', host: '', start_time: '11:00', end_time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'La Entrevista de Frente', host: 'Rubén Sánchez', start_time: '10:00', end_time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Jay en el 580', host: 'Jay Fonseca', start_time: '12:00', end_time: '14:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Generación Digital 580', host: 'Nancy Medina', start_time: '12:00', end_time: '13:00', days: ['Sat'] },
  { name: 'Domingo Deportivo', host: 'Julio Hernández', start_time: '14:00', end_time: '15:00', days: ['Sun'] },
  { name: 'Cátedra 580', host: 'Néstor Duprey y José Efraín Hernández', start_time: '14:00', end_time: '15:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Mayra en el 580', host: 'Mayra López Mulero', start_time: '15:00', end_time: '16:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Jangueando en el Wikén', host: 'Luis Pabón Roca', start_time: '15:00', end_time: '16:00', days: ['Sat'] },
  { name: 'Mayra en el 580', host: 'Mayra Mulero', start_time: '15:00', end_time: '16:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Ruta 580', host: 'Karla Jani Díaz', start_time: '16:00', end_time: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Fiscalía 580', host: 'Lic. Ernie Cabán y Lic. Osvaldo Carlo Linares', start_time: '16:00', end_time: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'WKAQ En la Tarde', host: 'Kike Cruz', start_time: '17:00', end_time: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Intimus', host: 'Veronique Abreu Tañón', start_time: '17:00', end_time: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Salud y Nutrición', host: 'Vilma Calderón', start_time: '18:00', end_time: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Debate 580', host: '', start_time: '19:00', end_time: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Pulso Económico', host: 'Gustavo Vélez', start_time: '19:00', end_time: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'De PR a Quisqueya', host: '', start_time: '20:00', end_time: '20:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Rendón Informa', host: '', start_time: '20:00', end_time: '21:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Jangueando en el Wikén', host: 'Luis Pabón Roca', start_time: '20:00', end_time: '21:00', days: ['Fri'] },
  { name: 'Generación Digital 580', host: 'Nancy Medina', start_time: '20:00', end_time: '21:00', days: ['Sat'] },
  { name: 'Unity', host: '', start_time: '21:00', end_time: '21:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Saliendo del Closet', host: 'Cecilia La Luz', start_time: '21:00', end_time: '22:00', days: ['Wed'] },
  { name: 'Salud y Nutrición', host: 'Vilma Calderón', start_time: '21:00', end_time: '22:00', days: ['Mon', 'Tue', 'Thu', 'Fri'] },
  { name: 'A Tu Lado', host: 'Izamary Castrodad', start_time: '21:00', end_time: '22:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Hora Legal', host: '', start_time: '22:00', end_time: '23:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Sin Separación de Iglesias y Estado', host: '', start_time: '20:00', end_time: '22:00', days: ['Sun'] },
  { name: 'Comunidad desde la Calle', host: '', start_time: '16:00', end_time: '17:00', days: ['Sat'] },
  { name: 'Voz del Centro', host: '', start_time: '19:00', end_time: '20:00', days: ['Sat'] },
  { name: 'Ventana al Mundo', host: '', start_time: '20:00', end_time: '21:00', days: ['Sat', 'Sun'] }
];

// Radio programs data for Radio Isla
export const radioIslaPrograms = [
  { name: 'Pegaos en la Mañana', host: 'Milly Méndez', start_time: '06:00', end_time: '08:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Puestos Pa\' La Mañana', host: 'Jonathan Lebrón and Luis Herrero', start_time: '08:00', end_time: '10:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Dígame La Verdad', host: 'Milly Méndez', start_time: '10:00', end_time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Tiempo Igual', host: 'Luis Penchi and Ismael Torres', start_time: '12:00', end_time: '14:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'OPC Radio', host: 'Aiola Virella and Manuel Guillama Capella', start_time: '14:00', end_time: '14:30', days: ['Tue'] },
  { name: 'URBITAL', host: 'Giancarlo González', start_time: '14:00', end_time: '15:30', days: ['Mon'] },
  { name: 'Felizmente Saludable', host: 'Lily García', start_time: '14:30', end_time: '15:00', days: ['Wed'] },
  { name: 'Agenda Propia', host: 'Damaris Suárez', start_time: '14:00', end_time: '15:00', days: ['Thu'] },
  { name: 'Agenda Municipal', host: 'Cristina Miranda Palacios y Edgard Gómez', start_time: '14:00', end_time: '15:00', days: ['Fri'] },
  { name: 'Pa\' Lante con Aeela', host: 'Luis Manuel Villar and Johanna Millán', start_time: '14:00', end_time: '15:00', days: ['Sat'] },
  { name: 'Motor Show PR', host: 'Andrés O\'Neill', start_time: '14:00', end_time: '15:00', days: ['Sun'] },
  { name: 'Damaris Suárez Ahora', host: 'Damaris Suárez', start_time: '15:00', end_time: '16:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Si No Lo Digo Reviento', host: 'Inés Quiles', start_time: '16:00', end_time: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Sobre La Mesa', host: 'Aníbal Acevedo Vilá', start_time: '16:00', end_time: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Noches con Sentido', host: 'Carlos José Ortega', start_time: '18:00', end_time: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
];

// Radio programs data for NotiUno
export const notiUnoPrograms = [
  { name: 'Normando en la Mañana', host: 'Normando Valentín', start_time: '06:00', end_time: '08:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'A Palo Limpio', host: 'Iván Rivera y Ramón Rosario', start_time: '08:00', end_time: '09:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Sin Miedo', host: 'Alex Delgado, Alejandro García P. y Carmelo Ríos', start_time: '09:00', end_time: '10:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Pelota Dura', host: 'Ferdinand Pérez y Carlos Mercader', start_time: '10:00', end_time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Prof. Ángel Rosa en el 630', host: 'Ángel Rosa', start_time: '12:00', end_time: '15:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'En Caliente', host: 'Carmen Jovet', start_time: '15:00', end_time: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'La Mirilla', host: 'Luis Dávila Colón', start_time: '17:00', end_time: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { name: 'Gustavo Vélez por el 630', host: 'Gustavo Vélez', start_time: '12:00', end_time: '13:00', days: ['Sat'] }
];
