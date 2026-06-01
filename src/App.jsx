import jsPDF from 'jspdf';
import { useState, useEffect } from "react";
import "./App.css";
import logoDany from "./assets/logo.svg";
import { supabase } from './supabaseClient';

function App() {
  const [etapa, setEtapa] = useState('carga');
  const [rol, setRol] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [usuarioId, setUsuarioId] = useState(null);

  const [tipoReporte, setTipoReporte] = useState('dia');
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split('T')[0]);

  // ── NUEVO: estados para reporte de ventas ──
  const [reporteProductos, setReporteProductos] = useState([]);
  const [reporteTotal, setReporteTotal] = useState(0);
  const [reporteArticulos, setReporteArticulos] = useState(0);

  const [statsVentas, setStatsVentas] = useState({ total: 0, ganancias: 0, productos: 0 });
  const [filtroControl, setFiltroControl] = useState('hoy');
  const [listaVentas, setListaVentas] = useState([]);

  const [filtroDetalle, setFiltroDetalle] = useState('hoy');
  const [statsDetalle, setStatsDetalle] = useState({
    total: 0, ganancias: 0, productos: 0,
    numVentas: 0, masAlta: 0, masBaja: 0, promedio: 0,
    ganMasAlta: 0, ganMasBaja: 0, ganPromedio: 0,
    masVendido: null, menosVendido: null, masIngresos: null
  });
  const [listaDetalleVentas, setListaDetalleVentas] = useState([]);
  const [listaDetalleProductos, setListaDetalleProductos] = useState([]);

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

  useEffect(() => {
    const timer = setTimeout(() => setEtapa('inicio'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const obtenerRango = (filtro) => {
    const hoy = new Date();
    let inicio, fin;
    if (filtro === 'hoy') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();
    } else if (filtro === 'ayer') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    } else if (filtro === 'semana') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();
    } else if (filtro === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString();
    } else if (filtro === 'año') {
      inicio = new Date(hoy.getFullYear(), 0, 1).toISOString();
      fin = new Date(hoy.getFullYear() + 1, 0, 1).toISOString();
    }
    return { inicio, fin };
  };

  const etiquetaPeriodo = (filtro) => {
    if (filtro === 'hoy') return 'hoy';
    if (filtro === 'ayer') return 'ayer';
    if (filtro === 'semana') return 'esta semana';
    if (filtro === 'mes') return 'este mes';
    return 'este año';
  };

  const cargarStatsResumen = async (filtro) => {
    const { inicio, fin } = obtenerRango(filtro);
    const { data: ventas } = await supabase
      .from('ventas')
      .select('id, total, fecha')
      .gte('fecha', inicio)
      .lt('fecha', fin);

    if (!ventas || ventas.length === 0) {
      setStatsVentas({ total: 0, ganancias: 0, productos: 0 });
      return;
    }

    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const ventaIds = ventas.map(v => v.id);
    const { data: detalles } = await supabase
      .from('detalle_ventas')
      .select('cantidad, precio_unitario, producto_id')
      .in('venta_id', ventaIds);

    let ganancias = 0;
    let totalProductos = 0;

    if (detalles && detalles.length > 0) {
      const productoIds = [...new Set(detalles.map(d => d.producto_id))];
      const { data: productosDB } = await supabase
        .from('productos')
        .select('id, precio_compra')
        .in('id', productoIds);
      const mapaPrecios = {};
      if (productosDB) productosDB.forEach(p => { mapaPrecios[p.id] = p.precio_compra; });
      detalles.forEach(d => {
        const costo = mapaPrecios[d.producto_id] || 0;
        ganancias += (d.precio_unitario - costo) * d.cantidad;
        totalProductos += d.cantidad;
      });
    }
    setStatsVentas({ total: totalVentas, ganancias, productos: totalProductos });
  };

  // ── NUEVO: función que carga los datos del reporte de ventas ──
  const cargarReporteVentas = async (tipo, fecha) => {
    let inicio, fin;
    const hoy = new Date();

    if (tipo === 'dia') {
      const d = new Date(fecha + 'T00:00:00');
      inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      fin = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
    } else if (tipo === 'semana') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();
    } else if (tipo === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString();
    } else if (tipo === 'anual') {
      inicio = new Date(hoy.getFullYear(), 0, 1).toISOString();
      fin = new Date(hoy.getFullYear() + 1, 0, 1).toISOString();
    }

    const { data: ventas } = await supabase
      .from('ventas')
      .select('id, total')
      .gte('fecha', inicio)
      .lt('fecha', fin);

    if (!ventas || ventas.length === 0) {
      setReporteProductos([]);
      setReporteTotal(0);
      setReporteArticulos(0);
      return;
    }

    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const ventaIds = ventas.map(v => v.id);

    const { data: detalles } = await supabase
      .from('detalle_ventas')
      .select('cantidad, precio_unitario, producto_id')
      .in('venta_id', ventaIds);

    if (!detalles || detalles.length === 0) {
      setReporteProductos([]);
      setReporteTotal(totalVentas);
      setReporteArticulos(0);
      return;
    }

    const productoIds = [...new Set(detalles.map(d => d.producto_id))];
    const { data: productosDB } = await supabase
      .from('productos')
      .select('id, nombre')
      .in('id', productoIds);

    const mapaProductos = {};
    if (productosDB) productosDB.forEach(p => { mapaProductos[p.id] = p.nombre; });

    const mapaAgrupado = {};
    let totalArticulos = 0;

    detalles.forEach(d => {
      totalArticulos += d.cantidad;
      if (!mapaAgrupado[d.producto_id]) {
        mapaAgrupado[d.producto_id] = {
          nombre: mapaProductos[d.producto_id] || 'Desconocido',
          cantidad: 0,
          precio: d.precio_unitario
        };
      }
      mapaAgrupado[d.producto_id].cantidad += d.cantidad;
    });

    const lista = Object.values(mapaAgrupado).sort((a, b) => b.cantidad - a.cantidad);
    setReporteProductos(lista);
    setReporteTotal(totalVentas);
    setReporteArticulos(totalArticulos);
  };

  const cargarDatosDetalle = async (filtro) => {
    const { inicio, fin } = obtenerRango(filtro);
    const { data: ventas } = await supabase
      .from('ventas')
      .select('id, total, fecha')
      .gte('fecha', inicio)
      .lt('fecha', fin)
      .order('fecha', { ascending: false });

    if (!ventas || ventas.length === 0) {
      setListaDetalleVentas([]);
      setListaDetalleProductos([]);
      setStatsDetalle({
        total: 0, ganancias: 0, productos: 0,
        numVentas: 0, masAlta: 0, masBaja: 0, promedio: 0,
        ganMasAlta: 0, ganMasBaja: 0, ganPromedio: 0,
        masVendido: null, menosVendido: null, masIngresos: null
      });
      return;
    }

    setListaDetalleVentas(ventas);
    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const totales = ventas.map(v => Number(v.total));
    const ventaIds = ventas.map(v => v.id);

    const { data: detalles } = await supabase
      .from('detalle_ventas')
      .select('venta_id, cantidad, precio_unitario, producto_id')
      .in('venta_id', ventaIds);

    let ganancias = 0;
    let totalProductos = 0;
    const productoMap = {};
    const gananciasPorVenta = {};

    if (detalles && detalles.length > 0) {
      const productoIds = [...new Set(detalles.map(d => d.producto_id))];
      const { data: productosDB } = await supabase
        .from('productos')
        .select('id, nombre, precio_compra')
        .in('id', productoIds);
      const mapaProductos = {};
      if (productosDB) productosDB.forEach(p => { mapaProductos[p.id] = p; });

      detalles.forEach(d => {
        const prod = mapaProductos[d.producto_id];
        const costo = prod ? prod.precio_compra : 0;
        const gan = (d.precio_unitario - costo) * d.cantidad;
        ganancias += gan;
        totalProductos += d.cantidad;
        if (!gananciasPorVenta[d.venta_id]) gananciasPorVenta[d.venta_id] = 0;
        gananciasPorVenta[d.venta_id] += gan;
        if (!productoMap[d.producto_id]) {
          productoMap[d.producto_id] = { nombre: prod ? prod.nombre : 'Desconocido', cantidad: 0, ingresos: 0, ganancia: 0 };
        }
        productoMap[d.producto_id].cantidad += d.cantidad;
        productoMap[d.producto_id].ingresos += d.precio_unitario * d.cantidad;
        productoMap[d.producto_id].ganancia += gan;
      });
    }

    const masAlta = totales.length > 0 ? Math.max(...totales) : 0;
    const masBaja = totales.length > 0 ? Math.min(...totales) : 0;
    const promedio = ventas.length > 0 ? totalVentas / ventas.length : 0;

    const gananciasArr = Object.values(gananciasPorVenta);
    const ganMasAlta = gananciasArr.length > 0 ? Math.max(...gananciasArr) : 0;
    const ganMasBaja = gananciasArr.length > 0 ? Math.min(...gananciasArr) : 0;
    const ganPromedio = ventas.length > 0 ? ganancias / ventas.length : 0;

    const listaProds = Object.values(productoMap).sort((a, b) => b.cantidad - a.cantidad);
    setListaDetalleProductos(listaProds);

    const masVendido = listaProds.length > 0 ? listaProds[0].nombre : null;
    const menosVendido = listaProds.length > 0 ? listaProds[listaProds.length - 1].nombre : null;
    const masIngresos = listaProds.length > 0 ? [...listaProds].sort((a, b) => b.ingresos - a.ingresos)[0].nombre : null;

    setStatsDetalle({
      total: totalVentas, ganancias, productos: totalProductos,
      numVentas: ventas.length, masAlta, masBaja, promedio,
      ganMasAlta, ganMasBaja, ganPromedio,
      masVendido, menosVendido, masIngresos
    });
  };

  const modificarCantidadVenta = (itemCatalogo, operacion) => {
    const existe = carrito.find(item => item.id === itemCatalogo.id);
    if (existe) {
      setCarrito(carrito.map(item =>
        item.id === itemCatalogo.id
          ? { ...item, cantidadVenta: operacion === 'sumar' ? item.cantidadVenta + 1 : Math.max(0, item.cantidadVenta - 1) }
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

  const manejarVolver = () => {
    setEtapa('inicio');
    setRol(''); setUsuario(''); setPassword(''); setUsuarioId(null);
    setCarrito([]); setMostrarCobro(false); setPagoRecibido(0);
  };

  const intentarEntrar = async () => {
    if (!rol || !usuario || !password) return alert("Por favor, completa todos los campos.");
    const { data, error } = await supabase
      .from('usuarios').select('*')
      .eq('nombre', usuario).eq('password', password).eq('rol', rol).single();
    if (error || !data) {
      alert("Usuario o contraseña incorrectos.");
    } else {
      setUsuarioId(data.id);
      setEtapa('menu');
    }
  };

  const guardarUsuario = async () => {
    if (!nuevoRol || !nuevoNombre || !nuevaPassword) return alert("Por favor, completa todos los campos.");
    const { error } = await supabase.from('usuarios').insert({ nombre: nuevoNombre, password: nuevaPassword, rol: nuevoRol });
    if (error) { alert("Error: " + error.message); }
    else {
      alert("Usuario registrado con éxito.");
      setNuevoNombre(''); setNuevaPassword(''); setNuevoRol('');
      setEtapa('menu');
    }
  };

  const guardarProducto = async () => {
    if (!producto.nombre || !producto.proveedor || !producto.categoria)
      return alert("Por favor, completa Proveedor, Categoría y Nombre.");
    const { data: provList } = await supabase.from('proveedores').select('id').eq('nombre', producto.proveedor);
    const { data: catList } = await supabase.from('categorias').select('id').eq('nombre', producto.categoria.trim());
    if (!provList || provList.length === 0 || !catList || catList.length === 0)
      return alert("No se encontró el proveedor o categoría.");
    const { error } = await supabase.from('productos').insert({
      nombre: producto.nombre, proveedor_id: provList[0].id, categoria_id: catList[0].id,
      cantidad: piezasTotalesCalculadas, stock_min: producto.stockMin, stock_max: producto.stockMax,
      precio_compra: producto.precioCompra, precio_venta: producto.precioVenta
    });
    if (error) { alert("Error: " + error.message); }
    else {
      alert("Producto registrado con éxito.");
      setProducto({ nombre: '', categoria: '', proveedor: '', cantidad: 0, unidad: '1', stockMin: 0, stockMax: 0, precioCompra: 0, precioVenta: 0 });
      setEtapa('menu');
    }
  };

  const confirmarVenta = async () => {
    if (pagoRecibido < totalDineroAPagar) return;
    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas').insert({ usuario_id: usuarioId, total: totalDineroAPagar, pago_recibido: pagoRecibido, cambio }).select().single();
    if (ventaError) return alert("Error al guardar venta: " + ventaError.message);
    const detalles = carrito.map(item => ({ venta_id: ventaData.id, producto_id: item.id, cantidad: item.cantidadVenta, precio_unitario: item.precioVenta }));
    const { error: detalleError } = await supabase.from('detalle_ventas').insert(detalles);
    if (detalleError) return alert("Error al guardar detalle: " + detalleError.message);
    for (const item of carrito) {
      const productoActual = inventario.find(p => p.id === item.id);
      if (productoActual) {
        await supabase.from('productos').update({ cantidad: productoActual.cantidad - item.cantidadVenta }).eq('id', item.id);
      }
    }
    const { data: nuevoInventario } = await supabase.from('productos').select('*').eq('activo', true);
    if (nuevoInventario) setInventario(nuevoInventario.map(p => ({ ...p, precioVenta: p.precio_venta, precioCompra: p.precio_compra })));
    alert("¡Venta registrada con éxito!");
    setCarrito([]); setPagoRecibido(0); setMostrarCobro(false); setEtapa('menu');
  };

  const compartirReportePDF = () => {
  const doc = new jsPDF();

  doc.setFillColor(33, 150, 243);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMERCIALIZADORA "DANY"', 105, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text('Resumen de Venta - Público en general', 105, 20, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const etiquetas = { dia: 'Día', semana: 'Esta Semana', mes: 'Este Mes', anual: 'Anual' };
  doc.text(`Periodo: ${etiquetas[tipoReporte] || tipoReporte}`, 14, 35);
  if (tipoReporte === 'dia') {
    doc.text(`Fecha: ${fechaReporte}`, 14, 42);
  }
  doc.text(`Artículos vendidos: ${reporteArticulos}`, 14, tipoReporte === 'dia' ? 49 : 42);

  let y = tipoReporte === 'dia' ? 58 : 52;
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Producto', 16, y + 5.5);
  doc.text('Precio unitario', 110, y + 5.5);
  doc.text('Cantidad', 170, y + 5.5);
  y += 10;

  doc.setFont('helvetica', 'normal');
  if (reporteProductos.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text('No hay datos para este periodo', 105, y + 6, { align: 'center' });
    y += 12;
  } else {
    reporteProductos.forEach((p, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(14, y, 182, 8, 'F');
      }
      doc.setTextColor(50, 50, 50);
      const nombre = p.nombre.length > 45 ? p.nombre.substring(0, 42) + '...' : p.nombre;
      doc.text(nombre, 16, y + 5.5);
      doc.text(`$${p.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 110, y + 5.5);
      doc.text(`${p.cantidad} pzs`, 170, y + 5.5);
      y += 9;
    });
  }

  y += 4;
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(33, 33, 68);
  doc.text(`TOTAL: $${reporteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 196, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const fechaGenerado = new Date().toLocaleString('es-MX');
  doc.text(`Generado el ${fechaGenerado}`, 105, 285, { align: 'center' });

  const nombreArchivo = `reporte_${tipoReporte}_${fechaReporte}.pdf`;
  doc.save(nombreArchivo);
};

  const FiltrosPeriodo = ({ filtroActual, onCambiar }) => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '25px', flexWrap: 'wrap' }}>
      {['hoy', 'ayer', 'semana', 'mes', 'año'].map(f => (
        <button key={f} onClick={() => onCambiar(f)}
          style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: filtroActual === f ? '#555' : '#e0e0e0', color: filtroActual === f ? 'white' : '#333', fontWeight: filtroActual === f ? 'bold' : 'normal', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {filtroActual === f && <span>✓</span>}
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );

  const etapasConHeader = ['menu', 'catalogo', 'ventas', 'devoluciones', 'control_ventas', 'reporte_ventas', 'detalle_ventas', 'detalle_ganancias', 'detalle_productos'];

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

      {etapasConHeader.includes(etapa) && (
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
                  <button className="btn-opcion" onClick={() => { cargarStatsResumen('hoy'); setEtapa('control_ventas'); }}>Control de Ventas</button>
                  <button className="btn-opcion" onClick={() => {cargarReporteVentas('dia', new Date().toISOString().split('T')[0]); setEtapa('reporte_ventas');}}>Reporte de Ventas
                  </button>
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

        {/* ── CONTROL DE VENTAS resumen 3 tarjetas ── */}
        {etapa === 'control_ventas' && (
          <div className="seccion-centrada" style={{ paddingTop: '70px', width: '100%' }}>
            <div style={{ background: '#2196F3', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box', position: 'fixed', top: '60px', left: 0, zIndex: 99 }}>
              <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setEtapa('menu')}>←</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Control de ventas</span>
            </div>
            <div style={{ width: '100%', padding: '80px 20px 20px', boxSizing: 'border-box' }}>

              <div onClick={() => { setFiltroDetalle('hoy'); cargarDatosDetalle('hoy'); setEtapa('detalle_ventas'); }}
                style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'left', cursor: 'pointer' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px', color: '#333' }}>Ventas</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
                  ${statsVentas.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>Ventas de hoy</p>
              </div>

              <div onClick={() => { setFiltroDetalle('hoy'); cargarDatosDetalle('hoy'); setEtapa('detalle_ganancias'); }}
                style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'left', cursor: 'pointer' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px', color: '#333' }}>Ganancias</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
                  ${statsVentas.ganancias.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>Ganancias de hoy</p>
              </div>

              <div onClick={() => { setFiltroDetalle('hoy'); cargarDatosDetalle('hoy'); setEtapa('detalle_productos'); }}
                style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'left', cursor: 'pointer' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px', color: '#333' }}>Productos</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
                  {statsVentas.productos}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>Productos vendidos hoy</p>
              </div>

              <button className="btn-volver-gris" style={{ width: '100%' }} onClick={() => setEtapa('menu')}>
                Volver al Menú
              </button>
            </div>
          </div>
        )}

        {/* ── DETALLE VENTAS ── */}
        {etapa === 'detalle_ventas' && (
          <div className="seccion-centrada" style={{ paddingTop: '70px', width: '100%' }}>
            <div style={{ background: '#2196F3', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box', position: 'fixed', top: '60px', left: 0, zIndex: 99 }}>
              <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setEtapa('control_ventas')}>←</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Control de ventas</span>
            </div>
            <div style={{ width: '100%', padding: '80px 20px 20px', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: '500' }}>Ventas de {etiquetaPeriodo(filtroDetalle)}</p>
                <p style={{ margin: '5px 0 0', fontSize: '40px', fontWeight: 'bold', color: '#2196F3' }}>
                  ${statsDetalle.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <FiltrosPeriodo filtroActual={filtroDetalle} onCambiar={(f) => { setFiltroDetalle(f); cargarDatosDetalle(f); }} />
              <div style={{ minHeight: '150px', marginBottom: '20px' }}>
                {listaDetalleVentas.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginTop: '40px' }}>No hay datos disponibles</p>
                ) : (
                  listaDetalleVentas.map((v, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '12px 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>Venta #{listaDetalleVentas.length - i}</div>
                        <div style={{ color: '#999', fontSize: '12px' }}>{new Date(v.fecha).toLocaleString('es-MX')}</div>
                      </div>
                      <div style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                        ${Number(v.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {[
                  { label: 'Número de ventas:', valor: statsDetalle.numVentas, esMonto: false },
                  { label: 'Venta más alta:', valor: statsDetalle.masAlta, esMonto: true },
                  { label: 'Venta más baja:', valor: statsDetalle.masBaja, esMonto: true },
                  { label: 'Venta promedio:', valor: statsDetalle.promedio, esMonto: true },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ color: '#333', fontSize: '15px' }}>{s.label}</span>
                    <span style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '15px' }}>
                      {s.esMonto ? `$${s.valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : s.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DETALLE GANANCIAS ── */}
        {etapa === 'detalle_ganancias' && (
          <div className="seccion-centrada" style={{ paddingTop: '70px', width: '100%' }}>
            <div style={{ background: '#2196F3', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box', position: 'fixed', top: '60px', left: 0, zIndex: 99 }}>
              <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setEtapa('control_ventas')}>←</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Control de ventas</span>
            </div>
            <div style={{ width: '100%', padding: '80px 20px 20px', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: '500' }}>Ganancias de {etiquetaPeriodo(filtroDetalle)}</p>
                <p style={{ margin: '5px 0 0', fontSize: '40px', fontWeight: 'bold', color: '#2196F3' }}>
                  ${statsDetalle.ganancias.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <FiltrosPeriodo filtroActual={filtroDetalle} onCambiar={(f) => { setFiltroDetalle(f); cargarDatosDetalle(f); }} />
              <div style={{ minHeight: '150px', marginBottom: '20px' }}>
                {listaDetalleVentas.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginTop: '40px' }}>No hay datos disponibles</p>
                ) : (
                  listaDetalleVentas.map((v, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '12px 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', textAlign: 'left' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>Venta #{listaDetalleVentas.length - i}</div>
                        <div style={{ color: '#999', fontSize: '12px' }}>{new Date(v.fecha).toLocaleString('es-MX')}</div>
                      </div>
                      <div style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
                        ${Number(v.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {[
                  { label: 'Número de ventas:', valor: statsDetalle.numVentas, esMonto: false },
                  { label: 'Ganancia más alta:', valor: statsDetalle.ganMasAlta, esMonto: true },
                  { label: 'Ganancia más baja:', valor: statsDetalle.ganMasBaja, esMonto: true },
                  { label: 'Ganancia promedio:', valor: statsDetalle.ganPromedio, esMonto: true },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ color: '#333', fontSize: '15px' }}>{s.label}</span>
                    <span style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '15px' }}>
                      {s.esMonto ? `$${s.valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : s.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DETALLE PRODUCTOS ── */}
        {etapa === 'detalle_productos' && (
          <div className="seccion-centrada" style={{ paddingTop: '70px', width: '100%' }}>
            <div style={{ background: '#2196F3', color: 'white', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box', position: 'fixed', top: '60px', left: 0, zIndex: 99 }}>
              <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setEtapa('control_ventas')}>←</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Control de ventas</span>
            </div>
            <div style={{ width: '100%', padding: '80px 20px 20px', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: '500' }}>Productos vendidos {etiquetaPeriodo(filtroDetalle)}</p>
                <p style={{ margin: '5px 0 0', fontSize: '40px', fontWeight: 'bold', color: '#2196F3' }}>
                  {statsDetalle.productos}
                </p>
              </div>
              <FiltrosPeriodo filtroActual={filtroDetalle} onCambiar={(f) => { setFiltroDetalle(f); cargarDatosDetalle(f); }} />
              <div style={{ minHeight: '150px', marginBottom: '20px' }}>
                {listaDetalleProductos.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px', marginTop: '40px' }}>No hay datos disponibles</p>
                ) : (
                  listaDetalleProductos.map((p, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '10px', padding: '12px 15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{p.nombre}</div>
                      <div style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '16px' }}>{p.cantidad} pzs</div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ color: '#333', fontSize: '15px' }}>Número de ventas:</span>
                  <span style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '15px' }}>{statsDetalle.numVentas}</span>
                </div>
                <div style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ color: '#333', fontSize: '15px' }}>Producto más vendido:</span>
                  <p style={{ color: '#2196F3', fontWeight: 'bold', margin: '4px 0 0' }}>{statsDetalle.masVendido || 'Sin datos disponibles'}</p>
                </div>
                <div style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span style={{ color: '#333', fontSize: '15px' }}>Producto menos vendido:</span>
                  <p style={{ color: '#2196F3', fontWeight: 'bold', margin: '4px 0 0' }}>{statsDetalle.menosVendido || 'Sin datos disponibles'}</p>
                </div>
                <div style={{ padding: '12px 0' }}>
                  <span style={{ color: '#333', fontSize: '15px' }}>Producto con más ingresos:</span>
                  <p style={{ color: '#2196F3', fontWeight: 'bold', margin: '4px 0 0' }}>{statsDetalle.masIngresos || 'Sin datos disponibles'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTE DE VENTAS ── */}
        {etapa === 'reporte_ventas' && (
          <div className="seccion-centrada">
            <div className="formulario-card" style={{ padding: '0', backgroundColor: '#fff', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: '#2196F3', color: 'white', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', fontSize: '20px' }} onClick={() => setEtapa('menu')}>←</span>
                <span style={{ fontWeight: 'bold' }}>Resumen de Venta</span>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ color: '#2196F3', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>Público en general</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#080808', fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Fecha</label>
                    <select
                      className="input-estilo"
                      style={{ fontSize: '12px', padding: '5px' }}
                      value={tipoReporte}
                      onChange={(e) => {
                        const nuevoTipo = e.target.value;
                        setTipoReporte(nuevoTipo);
                        if (nuevoTipo !== 'dia') cargarReporteVentas(nuevoTipo, fechaReporte);
                      }}
                    >
                      <option value="dia">Día</option>
                      <option value="semana">Esta Semana</option>
                      <option value="mes">Este Mes</option>
                      <option value="anual">Anual</option>
                    </select>
                    {tipoReporte === 'dia' && (
                      <input
                        type="date"
                        className="input-estilo"
                        style={{ marginTop: '5px', fontSize: '12px' }}
                        value={fechaReporte}
                        onChange={(e) => {
                          setFechaReporte(e.target.value);
                          cargarReporteVentas('dia', e.target.value);
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <label style={{ color: '#080808', fontWeight: 'bold', display: 'block', fontSize: '14px' }}>Artículos</label>
                    <p style={{ color: '#080808', margin: 0, fontWeight: 'bold', fontSize: '20px' }}>{reporteArticulos}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444141', paddingBottom: '5px', marginBottom: '10px' }}>
                  <span style={{ color: '#080808', fontWeight: 'bold' }}>Productos</span>
                  <span style={{ color: '#080808', fontWeight: 'bold' }}>Cantidad</span>
                </div>

                <div style={{ minHeight: '200px', textAlign: 'left' }}>
                  {reporteProductos.length === 0 ? (
                    <>
                      <p style={{ color: '#2196F3', fontSize: '14px', fontWeight: 'bold' }}>Precio:</p>
                      <p style={{ textAlign: 'center', color: '#ccc', marginTop: '50px' }}>No hay datos para este periodo</p>
                    </>
                  ) : (
                    <>
                      {reporteProductos.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>{p.nombre}</div>
                            <div style={{ fontSize: '12px', color: '#2196F3', fontWeight: 'bold' }}>
                              ${p.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>
                            {p.cantidad} pzs
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div style={{ marginTop: '20px', borderTop: '2px solid #2b2929', paddingTop: '10px', textAlign: 'center' }}>
                  <h3 style={{ color: '#232441', margin: 0 }}>
                    Total: ${reporteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </h3>
                </div>

                <button
                  className="btn-principal"
                  style={{ marginTop: '30px', backgroundColor: 'white', color: '#2196F3', border: '1px solid #2196F3', borderRadius: '25px' }}
                  onClick={compartirReportePDF}
                >
                  COMPARTIR (PDF)
                </button>
              </div>
            </div>
            <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver al Menú</button>
          </div>
        )}

        {/* ── CATÁLOGO ── */}
        {etapa === 'catalogo' && (
          <div className="seccion-centrada">
            {rol === 'Administrador' ? (
              <div className="formulario-card">
                <h3 style={{ background: '#003366', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>Registro de Producto</h3>
                <label className="etiqueta-dibujo">Proveedor</label>
                <select className="input-estilo" value={producto.proveedor} onChange={(e) => setProducto({ ...producto, proveedor: e.target.value, categoria: '' })}>
                  <option value="">-- Seleccionar Proveedor --</option>
                  {Object.keys(categoriasPorProveedor).map(prov => (<option key={prov} value={prov}>{prov}</option>))}
                </select>
                <label className="etiqueta-dibujo">Categoría</label>
                <select className="input-estilo" value={producto.categoria} onChange={(e) => setProducto({ ...producto, categoria: e.target.value })} disabled={!producto.proveedor}>
                  <option value="">-- Seleccionar Categoría --</option>
                  {producto.proveedor && categoriasPorProveedor[producto.proveedor].map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
                <label className="etiqueta-dibujo">Nombre del Artículo</label>
                <input className="input-estilo" type="text" placeholder="Nombre" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="input-estilo" type="number" placeholder="Cantidad" value={producto.cantidad || ''} onChange={(e) => setProducto({ ...producto, cantidad: Number(e.target.value) })} />
                  <select className="input-estilo" value={producto.unidad} onChange={(e) => setProducto({ ...producto, unidad: e.target.value })}>
                    <option value="1">Piezas</option>
                    <option value="12">Docenas</option>
                    <option value="4">Cajas (4 pzs)</option>
                    <option value="20">Cajas (20 pzs)</option>
                    <option value="24">Cajas (24 pzs)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="input-estilo" type="number" placeholder="Stock Mín" value={producto.stockMin || ''} onChange={(e) => setProducto({ ...producto, stockMin: Number(e.target.value) })} />
                  <input className="input-estilo" type="number" placeholder="Stock Máx" value={producto.stockMax || ''} onChange={(e) => setProducto({ ...producto, stockMax: Number(e.target.value) })} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}><input className="input-estilo" type="number" placeholder="Precio compra" value={producto.precioCompra || ''} onChange={(e) => setProducto({ ...producto, precioCompra: Number(e.target.value) })} /></div>
                  <div style={{ flex: 1 }}><input className="input-estilo" type="number" placeholder="Precio venta" value={producto.precioVenta || ''} onChange={(e) => setProducto({ ...producto, precioVenta: Number(e.target.value) })} /></div>
                </div>
                <div className="panel-resultados" style={{ fontSize: '12px', background: '#e3f2fd', padding: '12px', borderRadius: '8px', margin: '15px 0', border: '1px solid #90caf9' }}>
                  <p className="resultado-item" style={{ fontWeight: 'bold', color: '#01579b', margin: '4px 0' }}>Piezas Totales: <span>{piezasTotalesCalculadas}</span></p>
                  <p className="resultado-item" style={{ color: '#2e7d32', margin: '4px 0' }}>Ganancia Total: <span>${gananciaTotal}</span></p>
                  <p className="resultado-item" style={{ margin: '4px 0' }}>Margen Sugerido: <span style={{ color: '#d84315', fontWeight: 'bold' }}>{margenGanancia}%</span></p>
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
                    <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: 0 }}>
                      {inventario.map(item => (
                        <li key={item.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '12px 15px', marginBottom: '12px', boxShadow: '0 3px 6px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '16px', color: '#222', display: 'block' }}>{item.nombre}</strong>
                            <small style={{ color: '#757575' }}>Stock: <b style={{ color: '#003366' }}>{item.cantidad}</b> disponibles</small>
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

        {/* ── VENTAS ── */}
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
                      <p style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No hay productos disponibles para vender.</p> :
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
                        );
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
                    <button className="btn-principal" style={{ flex: 1, background: '#2e7d32' }} onClick={confirmarVenta} disabled={pagoRecibido < totalDineroAPagar}>Confirmar</button>
                    <button className="btn-principal" style={{ flex: 1, background: '#dc3545' }} onClick={() => { setMostrarCobro(false); setPagoRecibido(0); }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DEVOLUCIONES ── */}
        {etapa === 'devoluciones' && (
          <div className="seccion-centrada">
            <div className="formulario-card">
              <h3 style={{ background: '#d32f2f', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>Gestión de Devoluciones</h3>
              <label className="etiqueta-dibujo">Bloc de Notas - Detalles de Devolución</label>
              <textarea className="input-estilo" style={{ width: '100%', height: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'none', fontSize: '14px', backgroundColor: '#d6866e' }} placeholder="Escribe aquí el motivo de la devolución, producto y cliente..." value={notasDevolucion} onChange={(e) => setNotasDevolucion(e.target.value)} />
              <button className="btn-principal" style={{ marginTop: '15px', background: '#003366' }} onClick={() => { alert("Nota de devolución guardada."); setEtapa('menu'); }}>Guardar Reporte</button>
              <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver al Menú</button>
            </div>
          </div>
        )}

        {/* ── REGISTRO ADMIN ── */}
        {etapa === 'registro_admin' && (
          <div className="formulario-card seccion-centrada">
            <h3 style={{ color: '#003366' }}>Alta de Nuevo Personal</h3>
            <label className="etiqueta-dibujo">Tipo de acceso</label>
            <select className="input-estilo" value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)}>
              <option value="">-- Seleccionar Rol --</option>
              <option value="Administrador">Administrador</option>
              <option value="Empleado">Empleado</option>
            </select>
            <input className="input-estilo" type="text" placeholder="Nombre de Usuario" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
            <input className="input-estilo" type="password" placeholder="Contraseña de acceso" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} />
            <button className="btn-principal" onClick={guardarUsuario}>Guardar Usuario</button>
            <button className="btn-texto" onClick={() => setEtapa('menu')}>Volver</button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;