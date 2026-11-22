import GenericCrudPage from "../../components/common/GenericCrudPage";

export default function ProveedoresPage() {
  return (
    <GenericCrudPage
      title="Proveedores"
      description="Las personas y empresas que te venden mercadería. Los eliges al registrar una compra."
      collectionName="proveedores"
      entityLabel="proveedor"
      defaultValues={{ codigo: "", nombre: "", nit: "", contacto: "", telefono: "", correo: "", direccion: "" }}
      fields={[
        { key: "nombre", label: "Nombre", required: true },
        { key: "codigo", label: "Código" },
        { key: "nit", label: "NIT o documento" },
        { key: "contacto", label: "Persona de contacto" },
        { key: "telefono", label: "Teléfono" },
        { key: "correo", label: "Correo", type: "email" },
        { key: "direccion", label: "Dirección", wide: true }
      ]}
      searchFields={["codigo", "nombre", "nit", "contacto", "telefono", "correo", "direccion"]}
      unicos={["codigo", "nombre"]}
      columns={[
        { key: "nombre", label: "PROVEEDOR" },
        { key: "codigo", label: "CÓDIGO" },
        { key: "nit", label: "NIT" },
        { key: "contacto", label: "CONTACTO" },
        { key: "telefono", label: "TELÉFONO" }
      ]}
    />
  );
}
