import { useState } from "react";
import "./App.css";

function App() {

  const [pantalla, setPantalla] = useState("inicio");

  if (pantalla === "inicio") {
    return (
      <div>

        <h1>Sistema de Gestión</h1>

        <button onClick={() => setPantalla("loginEmpleado")}>
          Iniciar sesión como Empleado
        </button>

        <button onClick={() => setPantalla("loginAdmin")}>
          Iniciar sesión como Administrador
        </button>

        <br /><br />

        <button onClick={() => setPantalla("registro")}>
          Crear cuenta
        </button>

      </div>
    );
  }

  if (pantalla === "loginEmpleado") {
    return (
      <div>
        <h2>Login Empleado</h2>
        <button onClick={() => setPantalla("inicio")}>Volver</button>
      </div>
    );
  }

  if (pantalla === "loginAdmin") {
    return (
      <div>
        <h2>Login Administrador</h2>
        <button onClick={() => setPantalla("inicio")}>Volver</button>
      </div>
    );
  }

  if (pantalla === "registro") {
    return (
      <div>
        <h2>Crear cuenta</h2>
        <button onClick={() => setPantalla("inicio")}>Volver</button>
      </div>
    );
  }

}

export default App;
