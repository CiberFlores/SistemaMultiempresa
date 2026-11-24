import { Component } from "react";

// Si una pantalla falla, se muestra esto en su lugar y el resto del sistema sigue funcionando.
export default class ErrorPantalla extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error, info) {
    console.error("Falló una pantalla:", error, info?.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <div className="admin-empty" role="alert">
        <p style={{ margin: "0 0 16px" }}>No pudimos mostrar esta pantalla. Tus datos están guardados.</p>
        <button type="button" className="primary-action" onClick={() => window.location.reload()}>
          Volver a cargar
        </button>
      </div>
    );
  }
}
