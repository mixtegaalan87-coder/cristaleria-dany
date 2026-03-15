import { useState, useEffect } from "react";
import "./App.css";
import logoDany from "./assets/logo.svg";
import { supabase } from './supabaseClient';

function App() {
  const [cargando, setCargando] = useState(true);
  const [pantalla, setPantalla] = useState("inicio");
  const [tipoRegistro, setTipoRegistro] = useState("");
  const [productos, setProductos] = useState([]);

  // --- ESTADOS PARA CAPTURAR LO QUE ESCRIBES ---
  const [nombreProd, setNombreProd] = useState("");
  const [precioProd, setPrecioProd] = useState("");
  const [materialProd, setMaterialProd] = useState("");

  useEffect(() => {
    obtenerProductos();
    const timer = setTimeout(() => setCargando(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function obtenerProductos() {
    const { data } = await supabase.from('productos').select('*');
    setProductos(data || []);
  }

  // --- FUNCIÓN PARA GUARDAR ---
  async function guardarEnBaseDeDatos() {
    if (!nombreProd || !precioProd) {
      alert("Mínimo pon nombre y precio");
      return;
    }

    const { error } = await supabase
      .from('productos')
      .insert([
        { nombre: nombreProd, precio: parseFloat(precioProd), material: materialProd }
      ]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("¡Producto guardado en Supabase!");
      setNombreProd(""); setPrecioProd(""); setMaterialProd("");
      obtenerProductos(); 
    }
  }

  // --- FUNCIÓN PARA ELIMINAR ---
  async function eliminarProducto(id) {
    const confirmar = window.confirm("¿Estás seguro de que quieres eliminar este producto?");
    
    if (confirmar) {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        alert("Producto eliminado correctamente");
        obtenerProductos(); 
      }
    }
  }

  if (cargando) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <img src={logoDany} alt="Logo" className="logo-splash" />
          <div className="cargando-puntos"><span></span><span></span><span></span></div>
        </div>
      </div>
    );
  }

  if (pantalla === "login") {
    return (
      <div id="root">
        <div className="barra-azul"></div>
        <div className="contenedor">
          <input type="text" placeholder="Nombre de usuario" />
          <input type="password" placeholder="Contraseña" />
          <select><option>Administrador</option><option>Empleado</option></select>
          <button>Entrar</button>
          <button onClick={() => setPantalla("inicio")}>Volver</button>
        </div>
      </div>
    );
  }

  if (pantalla === "registro") {
    return (
      <div id="root">
        <div className="barra-azul"></div>
        <div className="contenedor">
          <h1>Crear cuenta / Producto</h1>
          {tipoRegistro === "" && (
            <>
              <button onClick={() => setTipoRegistro("admin")}>Nuevo Administrador</button>
              <button onClick={() => setTipoRegistro("empleado")}>Nuevo Empleado</button>
            </>
          )}
          
          {tipoRegistro === "admin" && (
            <div>
              <h2>Registro de Producto (Admin)</h2>
              <input type="text" placeholder="Nombre del Producto" value={nombreProd} onChange={(e) => setNombreProd(e.target.value)} />
              <input type="number" placeholder="Precio" value={precioProd} onChange={(e) => setPrecioProd(e.target.value)} />
              <input type="text" placeholder="Material" value={materialProd} onChange={(e) => setMaterialProd(e.target.value)} />
              <button onClick={guardarEnBaseDeDatos} style={{backgroundColor: '#007bff'}}>Guardar Producto</button>
            </div>
          )}

          <button onClick={() => { setPantalla("inicio"); setTipoRegistro(""); }}>Volver</button>
        </div>
      </div>
    );
  }

  if (pantalla === "inventario") {
    return (
      <div id="root">
        <div className="barra-azul"></div>
        <div className="contenedor">
          <h1>📦 Inventario Real</h1>
          <div style={{ textAlign: 'left', color: 'black' }}>
            {productos.map((p) => (
              <div key={p.id} style={{ 
                borderBottom: '1px solid #ccc', 
                padding: '10px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <div>
                  <strong>{p.nombre}</strong> <br/>
                  <small>Precio: ${p.precio}</small>
                </div>

                <button 
                  onClick={() => eliminarProducto(p.id)} 
                  style={{ backgroundColor: '#d32f2f', color: 'white', padding: '5px' }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setPantalla("inicio")}>Volver</button>
        </div>
      </div>
    );
  }
  
  return (
    <div id="root">
      <div className="barra-azul"></div>
      <div className="contenedor">
        <h1>SISTEMA DANY V2</h1>
        <button onClick={() => setPantalla("login")}>Iniciar sesión</button>
        <button onClick={() => setPantalla("registro")}>Registrar Nuevo</button>
        <button onClick={() => setPantalla("inventario")} style={{marginTop: '10px', backgroundColor: '#2e7d32', color: 'white'}}>🔍 Ver Inventario</button>
      </div>
    </div>
  );
}

export default App;