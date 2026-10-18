import GenericCrudPage from "../../components/common/GenericCrudPage";

const TIPOS_NOTIFICACION = [
  { value: "INFO", label: "Información" },
  { value: "ADVERTENCIA", label: "Advertencia" },
  { value: "CRITICA", label: "Alerta crítica" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "SEGURIDAD", label: "Seguridad" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "VENCIMIENTO", label: "Vencimiento / renovación" },
  { value: "ACTUALIZACION", label: "Actualización de plataforma" },
  { value: "SISTEMA", label: "Sistema" }
];

const PRIORIDADES = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" }
];

const AUDIENCIAS = [
  { value: "TODOS", label: "Todos los usuarios" },
  { value: "ADMINS", label: "Administradores de empresa" },
  { value: "TRABAJADORES", label: "Trabajadores" },
  { value: "SUPER_ADMIN", label: "Solo Super Admin" }
];

export default function NotificacionesGlobalesPage() {
  return (
    <GenericCrudPage
      title="Notificaciones globales"
      description="Mensajes y alertas generales de la plataforma. Puedes definir tipo, prioridad y audiencia."
      collectionName="notificacionesGlobales"
      globalCollection
      entityLabel="notificación"
      defaultValues={{
        titulo: "",
        mensaje: "",
        tipo: "INFO",
        prioridad: "MEDIA",
        audiencia: "TODOS",
        estado: "ACTIVO"
      }}
      fields={[
        { key: "titulo", label: "Título", required: true },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS_NOTIFICACION, required: true },
        { key: "prioridad", label: "Prioridad", type: "select", options: PRIORIDADES, required: true },
        { key: "audiencia", label: "Audiencia", type: "select", options: AUDIENCIAS, required: true },
        { key: "mensaje", label: "Mensaje", type: "textarea", wide: true, required: true }
      ]}
      columns={[
        { key: "titulo", label: "TÍTULO" },
        { key: "tipo", label: "TIPO" },
        { key: "prioridad", label: "PRIORIDAD" },
        { key: "audiencia", label: "AUDIENCIA" }
      ]}
      extraFilters={[
        { key: "tipo", label: "Todos los tipos", options: TIPOS_NOTIFICACION },
        { key: "prioridad", label: "Todas las prioridades", options: PRIORIDADES },
        { key: "audiencia", label: "Todas las audiencias", options: AUDIENCIAS }
      ]}
      searchFields={["titulo", "mensaje", "tipo", "prioridad", "audiencia"]}
    />
  );
}
