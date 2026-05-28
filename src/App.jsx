import { useState, useEffect } from "react";
import "./App.css";
import logoDany from "./assets/logo.svg";
import { supabase } from './supabaseClient';

function App() {
  const [etapa, setEtapa] = useState('carga'); 
  const [rol, setRol] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const [tipoReporte, setTipoReporte] = useState('dia');
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split('T')[0]);

  const categoriasPorProveedor = {
    "El Gato": ["Productos de plástico para el hogar"],
    "Piquio": ["Loza", "Cristalería"],
    "Vencort": ["Peltre", "Loza", "Aluminio", "Acero inoxidable", "Electrodomésticos para el hogar"],
    "Jaciería Cruz": ["Artículos de limpieza para el hogar"],
    "Casa Estela": ["Artículos de panadería", "Artículos de repostería"],
    "Plásticos Liliant": ["Plástico", "Limpieza para el hogar"],
    "Pabero": ["Bolsas de plástico", "Polipapel"],
    "Papelería Amorcito Corazón": ["Papel para regalo ", "Celosa", "Moños mágicos"]
  };

  const [inventario, setInventario] = useState([]); 
  const [producto, setProducto] = useState({
    nombre: '', categoria: '', proveedor: '',
    cantidad: 0, unidad: '1', stockMin: 0, stockMax: 0,
    precioCompra: 0, precioVenta: 0
  });

  const [carrito, setCarrito] = useState([]);
  const [fechaExacta, setFechaExacta] = useState('');
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [pagoRecibido, setPagoRecibido] = useState(0);
  const [notasDevolucion, setNotasDevolucion] = useState('');

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState('');

  useEffect(() => {
    const timerFecha = setInterval(() => {
      const ahora = new Date();
      setFechaExacta(ahora.toLocaleDateString() + " " + ahora.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timerFecha);
  }, []);
useEffect(() => {
  const cargarInventario = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true);
    if (!error && data) {
      setInventario(data.map(p => ({
        ...p,
        precioVenta: p.precio_venta,
        precioCompra: p.precio_compra
      })));
    }
  };
  cargarInventario();
}, []);

  const modificarCantidadVenta = (itemCatalogo, operacion) => {
    const existe = carrito.find(item => item.id === itemCatalogo.id);
    if (existe) {
      setCarrito(carrito.map(item => 
        item.id === itemCatalogo.id 
          ? { ...item, cantidadVenta: operacion === 'sumar' 
              ? item.cantidadVenta + 1 
              : Math.max(0, item.cantidadVenta - 1) }
          : item
      ).filter(item => item.cantidadVenta > 0)); 
    } else if (operacion === 'sumar') {
      setCarrito([...carrito, { ...itemCatalogo, cantidadVenta: 1 }]);
    }
  };

  const totalArticulosVenta = carrito.reduce((acc, item) => acc + item.cantidadVenta, 0);
  const totalDineroAPagar = carrito.reduce((acc, item) => acc + (item.cantidadVenta * item.precioVenta), 0);
  const cambio = pagoRecibido > totalDineroAPagar ? pagoRecibido - totalDineroAPagar : 0;

  const piezasTotalesCalculadas = producto.cantidad * Number(producto.unidad);
  const gananciaUnitaria = producto.precioVenta - producto.precioCompra;
  const gananciaTotal = gananciaUnitaria * piezasTotalesCalculadas;
  const margenGanancia = producto.precioVenta > 0 
    ? ((gananciaUnitaria / producto.precioVenta) * 100).toFixed(2) 
    : 0;

  useEffect(() => {
    const timer = setTimeout(() => setEtapa('inicio'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const manejarVolver = () => {
    setEtapa('inicio');
    setRol('');
    setUsuario('');
    setPassword('');
    setCarrito([]);
    setMostrarCobro(false);
    setPagoRecibido(0);
  };

  const intentarEntrar = async () => {
    if (!rol || !usuario || !password) {
      return alert("Por favor, completa todos los campos.");
    }
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('nombre', usuario)
      .eq('contraseña', password)
      .eq('rol', rol)
      .single();

    if (error || !data) {
      alert("Usuario o contraseña incorrectos.");
    } else {
      setEtapa('menu');
    }
  };

  const guardarProducto = async () => {
  if (!producto.nombre || !producto.proveedor || !producto.categoria) {
    return alert("Por favor, completa Proveedor, Categoría y Nombre.");
  }
  
  // ↓ AGREGA AQUÍ
const guardarUsuario = async () => {
  if (!nuevoRol || !nuevoNombre || !nuevaPassword) {
    return alert("Por favor, completa todos los campos.");
  }
  const { error } = await supabase
    .from('usuarios')
    .insert({ nombre: nuevoNombre, "contraseña": nuevaPassword, rol: nuevoRol });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Usuario registrado con éxito.");
    setNuevoNombre('');
    setNuevaPassword('');
    setNuevoRol('');
    setEtapa('menu');
  }
};

  // Buscar proveedor
  const { data: provList } = await supabase
    .from('proveedores')
    .select('id')
    .eq('nombre', producto.proveedor);

  const { data: catList } = await supabase
    .from('categorias')
    .select('id')
    .eq('nombre', producto.categoria.trim());

  if (!provList || provList.length === 0 || !catList || catList.length === 0) {
    return alert("No se encontró el proveedor o categoría.");
  }

  const { error } = await supabase
    .from('productos')
    .insert({
      nombre: producto.nombre,
      proveedor_id: provList[0].id,
      categoria_id: catList[0].id,
      cantidad: piezasTotalesCalculadas,
      stock_min: producto.stockMin,
      stock_max: producto.stockMax,
      precio_compra: producto.precioCompra,
      precio_venta: producto.precioVenta
    });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Producto registrado con éxito.");
    setProducto({
      nombre: '', categoria: '', proveedor: '',
      cantidad: 0, unidad: '1', stockMin: 0, stockMax: 0,
      precioCompra: 0, precioVenta: 0
    });
    setEtapa('menu');
  }
};
  

  const compartirReportePDF = () => {
    alert("Generando archivo PDF del reporte " + tipoReporte + "...");
  };

  const estiloTarjeta = {
    background: '#fff',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  };

  const estiloTituloTarjeta = { margin: 0, fontSize: '18px', color: '#333' };
  const estiloMontoTarjeta = { margin: '10px 0', fontSize: '32px', color: '#64B5F6', fontWeight: 'bold' };
  const estiloSubtextoTarjeta = { margin: 0, fontSize: '12px', color: '#999' };
  const estiloFlecha = { position: 'absolute', right: '20px', top: '25px', fontSize: '20px' };

  return (
    <div className="App">
      {etapa === 'carga' && (
        <div className="splash-screen">
          <div className="splash-content">
            <img src={logoDany} className="logo-movil" alt="Logo Dany" />
            <div className="puntos-loading">
              <div className="punto"></div>
              <div className="punto"></div>
              <div className="punto"></div>
            </div>
          </div>
        </div>
      )}

      {(etapa === 'menu' || etapa === 'catalogo' || etapa === 'ventas' || etapa === 'devoluciones' || etapa === 'control_ventas' || etapa === 'reporte_ventas') && (
        <header className="barra-superior">
          <div className="info-sesion">
            <div className="avatar">{usuario[0]?.toUpperCase()}</div>
            <span>{usuario} <strong>({rol})</strong></span>
          </div>
        </header>
      )}

      <div className="contenedor-principal">
        <h1 className="titulo-app">COMERCIALIZADORA "DANY"</h1>

        {etapa === 'inicio' && (
          <div className="seccion-centrada">
            <p className="subtitulo">Control de Inventario - San Andrés Tuxtla</p>
            <button className="btn-principal" onClick={() => setEtapa('login')}>Acceder</button>
          </div>
        )}

        {etapa === 'login' && (
          <div className="formulario-card seccion-centrada">
            <label className="etiqueta-dibujo">Tipo de acceso</label>
            <select className="input-estilo" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="">-- Seleccionar Rol --</option>
              <option value="Administrador">Administrador</option>
              <option value="Empleado">Empleado</option>
            </select>
            <input className="input-estilo" type="text" placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            <input className="input-estilo" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn-principal" onClick={intentarEntrar}>Continuar</button>
            <button className="btn-texto" onClick={manejarVolver}>Volver</button>
          </div>
        )}

        {etapa === 'menu' && (
          <div className="seccion-centrada">
            <div className="grid-botones">
              {rol === 'Administrador' ? (
                <>
                  <button className="btn-opcion" onClick={() => setEtapa('registro_admin')}>Nuevo Usuario</button>
                  <button className="btn-opcion" onClick={() => setEtapa('catalogo')}>Catálogo de Productos</button>
                  <button className="btn-opcion" onClick={() => setEtapa('control_ventas')}>Control de Ventas</button>
                  <button className="btn-opcion" onClick={() => setEtapa('reporte_ventas')}>Reporte de Ventas</button>
                </>
              ) : (
                <>
                  <button className="btn-opcion" onClick={() => setEtapa('ventas')}>Ventas</button>
                  <button className="btn-opcion" onClick={() => setEtapa('catalogo')}>Catálogo de Productos</button>
                  <button className="btn-opcion" onClick={() => setEtapa('devoluciones')}>Devoluciones</button>
                </>
              )}
            </div>
            <button className="btn-volver-gris" onClick={manejarVolver}>Cerrar Sesión</button>
          </div>
        )}

        {etapa === 'reporte_ventas' && (
          <div className="seccion-centrada">
            <div className="formulario-card" style={{ padding: '0', backgroundColor: '#fff', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: '#2196F3', color: 'white', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', fontSize: '20px' }} onClick={() => setEtapa('menu')}>←</span>
                <span style={{ fontWeight: 'bold' }}>Resumen de Venta</span>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ color: '#2196F3', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>Publico en general</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#080808', fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Fecha</label>
                    <select className="input-estilo" style={{ fontSize: '12px', padding: '5px' }} value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
                      <option value="dia">Día</option>
                      <option value="semana">Esta Semana</option>
                      <option value="mes">Este Mes</option>
                      <option value="anual">Anual</option>
                    </select>
                    {tipoReporte === 'dia' && (
                      <input type="date" className="input-estilo" style={{ marginTop: '5px', fontSize: '12px' }} value={fechaReporte} onChange={(e) => setFechaReporte(e.target.value)} />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <label style={{ color: '#080808', fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Artículos</label>
                    <p style={{ color: '#080808', margin: 0 }}>0</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444141', paddingBottom: '5px' }}>
                  <span style={{ color: '#080808', fontWeight: 'bold' }}>Productos</span>
                  <span style={{ color: '#080808', fontWeight: 'bold' }}>Cantidad</span>
                </div>
                <div style={{ minHeight: '200px', textAlign: 'left', paddingTop: '10px' }}>
                  <p style={{ color: '#2196F3', fontSize: '14px', fontWeight: 'bold' }}>Precio:</p>
                  <p style={{ textAlign: 'center', color: '#ccc', marginTop: '50px' }}>No hay datos para este periodo</p>
                </div>
                <div style={{ marginTop: 'auto', borderTop: '2px solid #2b2929', paddingTop: '10px', textAlign: 'center' }}>
                  <h3 style={{ color: '#232441', margin: 0 }}>Total: $0.00</h3>
                </div>
                <button className="btn-principal" style={{ marginTop: '30px', backgroundColor: 'white', color: '#2196F3', border: '1px solid #2196F3', borderRadius: '25px' }} onClick={compartirReportePDF}>
                  COMPARTIR (PDF)
                </button>
              </div>
            </div>
            <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver al Menú</button>
          </div>
        )}

        {etapa === 'catalogo' && (
          <div className="seccion-centrada">
            {rol === 'Administrador' ? (
              <div className="formulario-card">
                <h3 style={{ background: '#003366', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>Registro de Producto</h3>
                <label className="etiqueta-dibujo">Proveedor</label>
                <select className="input-estilo" value={producto.proveedor} onChange={(e) => setProducto({...producto, proveedor: e.target.value, categoria: ''})}>
                  <option value="">-- Seleccionar Proveedor --</option>
                  {Object.keys(categoriasPorProveedor).map(prov => (<option key={prov} value={prov}>{prov}</option>))}
                </select>
                <label className="etiqueta-dibujo">Categoría</label>
                <select className="input-estilo" value={producto.categoria} onChange={(e) => setProducto({...producto, categoria: e.target.value})} disabled={!producto.proveedor}>
                  <option value="">-- Seleccionar Categoría --</option>
                  {producto.proveedor && categoriasPorProveedor[producto.proveedor].map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
                <label className="etiqueta-dibujo">Nombre del Artículo</label>
                <input className="input-estilo" type="text" placeholder="Nombre" value={producto.nombre} onChange={(e) => setProducto({...producto, nombre: e.target.value})} />
                <div style={{display: 'flex', gap: '10px'}}>
                  <input className="input-estilo" type="number" placeholder="Cantidad" value={producto.cantidad || ''} onChange={(e) => setProducto({...producto, cantidad: Number(e.target.value)})} />
                  <select className="input-estilo" value={producto.unidad} onChange={(e) => setProducto({...producto, unidad: e.target.value})}>
                    <option value="1">Piezas</option>
                    <option value="12">Docenas</option>
                    <option value="4">Cajas (4 pzs)</option>
                    <option value="20">Cajas (20 pzs)</option>
                    <option value="24">Cajas (24 pzs)</option>
                  </select>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input className="input-estilo" type="number" placeholder="Stock Mín" value={producto.stockMin || ''} onChange={(e) => setProducto({...producto, stockMin: Number(e.target.value)})} />
                  <input className="input-estilo" type="number" placeholder="Stock Máx" value={producto.stockMax || ''} onChange={(e) => setProducto({...producto, stockMax: Number(e.target.value)})} />
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <div style={{flex: 1}}><input className="input-estilo" type="number" placeholder="Precio compra" value={producto.precioCompra || ''} onChange={(e) => setProducto({...producto, precioCompra: Number(e.target.value)})} /></div>
                  <div style={{flex: 1}}><input className="input-estilo" type="number" placeholder="Precio venta" value={producto.precioVenta || ''} onChange={(e) => setProducto({...producto, precioVenta: Number(e.target.value)})} /></div>
                </div>
                <div className="panel-resultados" style={{fontSize: '12px', background: '#e3f2fd', padding: '12px', borderRadius: '8px', margin: '15px 0', border: '1px solid #90caf9'}}>
                  <p className="resultado-item" style={{fontWeight: 'bold', color: '#01579b', margin: '4px 0'}}>Piezas Totales: <span>{piezasTotalesCalculadas}</span></p>
                  <p className="resultado-item" style={{color: '#2e7d32', margin: '4px 0'}}>Ganancia Total: <span>${gananciaTotal}</span></p>
                  <p className="resultado-item" style={{margin: '4px 0'}}>Margen Sugerido: <span style={{color: '#d84315', fontWeight: 'bold'}}>{margenGanancia}%</span></p>
                </div>
                <button className="btn-principal" onClick={guardarProducto}>Registrar en Catálogo</button>
              </div>
            ) : (
              <div className="formulario-card" style={{ padding: '0', overflow: 'hidden' }}>
                <h3 style={{ background: '#003366', color: 'white', margin: '0', padding: '15px', textAlign: 'center' }}>Catálogo de Productos</h3>
                <div style={{ padding: '20px' }}>
                  {inventario.length === 0 ? (
                    <div style={{ background: '#fff3e0', color: '#e65100', padding: '20px', borderRadius: '8px', border: '1px dashed #ffb74d', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>El inventario está vacío actualmente.</p>
                    </div>
                  ) : (
                    <ul style={{textAlign: 'left', listStyle: 'none', padding: 0, margin: 0}}>
                      {inventario.map(item => (
                        <li key={item.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '12px 15px', marginBottom: '12px', boxShadow: '0 3px 6px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{fontSize: '16px', color: '#222', display: 'block'}}>{item.nombre}</strong>
                            <small style={{color: '#757575'}}>Stock: <b style={{color: '#003366'}}>{item.cantidad}</b> disponibles</small>
                          </div>
                          <div style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: '800', fontSize: '18px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                            ${item.precioVenta}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <button className="btn-texto" style={{ marginTop: '15px' }} onClick={() => setEtapa('menu')}>Volver al Menú</button>
          </div>
        )}

        {etapa === 'ventas' && (
          <div className="seccion-centrada">
            <div className="formulario-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '15px', color: '#555' }}>
                <span>🕒 {fechaExacta}</span>
                <span>Artículos: <strong>{totalArticulosVenta}</strong></span>
              </div>
              <h3 style={{ color: '#003366', textAlign: 'center', marginBottom: '20px' }}>Punto de Venta</h3>
              {!mostrarCobro ? (
                <>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', textAlign: 'left', marginBottom: '20px', paddingRight: '5px' }}>
                    {inventario.length === 0 ? 
                      <p style={{textAlign: 'center', color: '#999', fontStyle: 'italic'}}>No hay productos disponibles para vender.</p> : 
                      inventario.map(item => {
                        const enCarrito = carrito.find(c => c.id === item.id);
                        return (
                          <div key={item.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{item.nombre}</div>
                              <div style={{ color: '#2e7d32', fontSize: '12px', fontWeight: '600' }}>${item.precioVenta} p/u</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <button style={{ background: '#ef5350', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer' }} onClick={() => modificarCantidadVenta(item, 'restar')}>-</button>
                              <span style={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{enCarrito ? enCarrito.cantidadVenta : 0}</span>
                              <button style={{ background: '#66bb6a', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer' }} onClick={() => modificarCantidadVenta(item, 'sumar')}>+</button>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                  <div style={{ background: '#003366', color: 'white', padding: '18px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '11px', textTransform: 'uppercase', opacity: 0.9 }}>Total de la Nota</p>
                    <h2 style={{ margin: 0, fontSize: '28px' }}>${totalDineroAPagar.toLocaleString()}</h2>
                  </div>
                  <button className="btn-principal" style={{ marginTop: '20px', height: '50px', fontSize: '18px' }} onClick={() => setMostrarCobro(true)} disabled={totalDineroAPagar === 0}>
                    Cobrar ${totalDineroAPagar.toLocaleString()}
                  </button>
                  <button className="btn-texto" onClick={() => setEtapa('menu')}>Cancelar Operación</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ddd' }}>
                    <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>TOTAL A PAGAR</p>
                    <h2 style={{ margin: 0, color: '#003366', fontSize: '32px' }}>${totalDineroAPagar.toLocaleString()}</h2>
                  </div>
                  <label style={{ display: 'block', textAlign: 'left', marginBottom: '8px', fontWeight: 'bold' }}>Cantidad Recibida:</label>
                  <input className="input-estilo" type="number" placeholder="$ 0.00" autoFocus value={pagoRecibido || ''} onChange={(e) => setPagoRecibido(Number(e.target.value))} style={{ fontSize: '22px', textAlign: 'center', height: '50px', border: '2px solid #003366' }} />
                  <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', marginTop: '20px', border: '2px dashed #2e7d32' }}>
                    <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold', fontSize: '12px' }}>CAMBIO:</p>
                    <h2 style={{ margin: 0, color: '#1b5e20', fontSize: '32px' }}>${cambio.toLocaleString()}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                    <button className="btn-principal" style={{ flex: 1, background: '#2e7d32' }} onClick={() => { alert("Venta finalizada con éxito"); setCarrito([]); setPagoRecibido(0); setMostrarCobro(false); setEtapa('menu'); }} disabled={pagoRecibido < totalDineroAPagar}>Confirmar</button>
                    <button className="btn-principal" style={{ flex: 1, background: '#dc3545' }} onClick={() => { setMostrarCobro(false); setPagoRecibido(0); }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {etapa === 'control_ventas' && (
          <div className="seccion-centrada">
            <div style={estiloTarjeta}>
              <span style={estiloFlecha}>→</span>
              <h3 style={estiloTituloTarjeta}>Ventas</h3>
              <p style={estiloMontoTarjeta}>$0.00</p>
              <p style={estiloSubtextoTarjeta}>Ventas de hoy</p>
            </div>
            <div style={estiloTarjeta}>
              <span style={estiloFlecha}>→</span>
              <h3 style={estiloTituloTarjeta}>Ganancias</h3>
              <p style={estiloMontoTarjeta}>$0.00</p>
              <p style={estiloSubtextoTarjeta}>Ganancias de hoy</p>
            </div>
            <div style={estiloTarjeta}>
              <span style={estiloFlecha}>→</span>
              <h3 style={estiloTituloTarjeta}>Productos</h3>
              <p style={{...estiloMontoTarjeta, color: '#64B5F6'}}>0</p>
              <p style={estiloSubtextoTarjeta}>Productos vendidos hoy</p>
            </div>
            <button className="btn-volver-gris" onClick={() => setEtapa('menu')}>Volver al Menú</button>
          </div>
        )}

        {etapa === 'devoluciones' && (
          <div className="seccion-centrada">
            <div className="formulario-card">
              <h3 style={{ background: '#d32f2f', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>Gestión de Devoluciones</h3>
              <label className="etiqueta-dibujo">Bloc de Notas - Detalles de Devolución</label>
              <textarea className="input-estilo" style={{ width: '100%', height: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'none', fontSize: '14px', backgroundColor: '#fffbe6' }} placeholder="Escribe aquí el motivo de la devolución, producto y cliente..." value={notasDevolucion} onChange={(e) => setNotasDevolucion(e.target.value)} />
              <button className="btn-principal" style={{ marginTop: '15px', background: '#003366' }} onClick={() => { alert("Nota de devolución guardada."); setEtapa('menu'); }}>Guardar Reporte</button>
              <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver al Menú</button>
            </div>
          </div>
        )}

        {etapa === 'registro_admin' && (
           <div className="formulario-card seccion-centrada">
             <h3 style={{ color: '#003366' }}>Alta de Nuevo Personal</h3>
             <label className="etiqueta-dibujo">Tipo de acceso</label>         {/* ← NUEVO */}
             <select className="input-estilo">                                   {/* ← NUEVO */}
               <option value="">-- Seleccionar Rol --</option>                   {/* ← NUEVO */}
               <option value="Administrador">Administrador</option>              {/* ← NUEVO */}
               <option value="Empleado">Empleado</option>                        {/* ← NUEVO */}
             </select>                                                           {/* ← NUEVO */}
               <input className="input-estilo" type="text" placeholder="Nombre de Usuario" />
                <input className="input-estilo" type="password" placeholder="Contraseña de acceso" />
               <button className="btn-principal" onClick={() => setEtapa('menu')}>Guardar Usuario</button>
               <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver</button>
              </div>
        )}

      </div>
    </div>
  );
}

export default App;
