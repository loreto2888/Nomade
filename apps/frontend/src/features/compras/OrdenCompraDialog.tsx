import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import { useCatalogo } from '@/api/catalogos';
import {
  useActualizarOrdenCompra,
  useCrearOrdenCompra,
  useOrdenTrabajo,
  useOrdenesTrabajo,
  type OrdenCompraDetalleDto,
  type OrdenCompraDto,
  type TipoOrdenCompra,
} from '@/api/compras';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import { MoneyField } from '@/components/MoneyField';
import {
  ETIQUETA_TIPO_OC,
  formatearPorcentaje,
  montoDePorcentaje,
  parsearPorcentaje,
} from '@/lib/compras';
import { formatCLP } from '@/lib/formato';
import { parsearCantidad } from '@/lib/presupuesto';
import { SelectorObra, SelectorProveedor, type Opcion } from './Selectores';

interface OrdenCompraDialogProps {
  abierto: boolean;
  /** OC a editar (borrador); sin ella se crea una nueva. */
  ordenCompra?: OrdenCompraDto;
  /** Al crear: tipo inicial y datos preseleccionados. */
  tipoInicial?: TipoOrdenCompra;
  ordenTrabajoId?: number;
  hitoId?: number;
  obra?: Opcion;
  onCerrar: () => void;
  onGuardada: (detalle: OrdenCompraDetalleDto, creada: boolean) => void;
}

interface FilaLinea {
  clave: number;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precioUnitario: number | null;
}

let siguienteClave = 1;
const lineaVacia = (): FilaLinea => ({
  clave: siguienteClave++,
  descripcion: '',
  unidad: '',
  cantidad: '',
  precioUnitario: null,
});

const hoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

/** Alta y edición de una OC: de materiales (con líneas) o parcial de una OT aprobada (hito + %). */
function OrdenCompraDialogAbierto({
  abierto,
  ordenCompra,
  tipoInicial = 'materiales',
  ordenTrabajoId,
  hitoId,
  obra,
  onCerrar,
  onGuardada,
}: OrdenCompraDialogProps) {
  const idTitulo = useId();
  const editando = ordenCompra !== undefined;
  const categorias = useCatalogo('categoria_gasto');
  const crear = useCrearOrdenCompra();
  const actualizar = useActualizarOrdenCompra();
  const mutacion = editando ? actualizar : crear;

  const oc = ordenCompra;
  const [tipo, setTipo] = useState<TipoOrdenCompra>(oc?.tipo ?? tipoInicial);
  const [obraSel, setObraSel] = useState<Opcion | null>(
    oc
      ? { id: oc.obra.id, etiqueta: oc.obra.nombre, detalle: oc.obra.codigoCentroCosto }
      : (obra ?? null),
  );
  const [proveedor, setProveedor] = useState<Opcion | null>(
    oc
      ? { id: oc.proveedor.id, etiqueta: oc.proveedor.razonSocial, detalle: oc.proveedor.rut }
      : null,
  );
  const [otId, setOtId] = useState<number | ''>(oc?.ordenTrabajo?.id ?? ordenTrabajoId ?? '');
  const [hito, setHito] = useState<number | ''>(oc?.hito?.id ?? hitoId ?? '');
  // `null` = aún no se escribe: se propone el disponible del hito elegido.
  const [porcentajeEscrito, setPorcentaje] = useState<string | null>(
    oc?.porcentaje !== null && oc?.porcentaje !== undefined
      ? String(oc.porcentaje).replace('.', ',')
      : null,
  );
  const [descripcion, setDescripcion] = useState(oc?.descripcion ?? '');
  const [categoriaGastoId, setCategoriaGastoId] = useState<number | ''>(oc?.categoria.id ?? '');
  const [fecha, setFecha] = useState(() => oc?.fecha ?? hoy());
  const [fechaEntrega, setFechaEntrega] = useState(oc?.fechaEntrega ?? '');
  const [afectaIva, setAfectaIva] = useState(oc?.afectaIva ?? true);
  const [lineas, setLineas] = useState<FilaLinea[]>(() =>
    oc && oc.lineas.length > 0
      ? oc.lineas.map((l) => ({
          clave: siguienteClave++,
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: String(l.cantidad).replace('.', ','),
          precioUnitario: l.precioUnitario,
        }))
      : [lineaVacia()],
  );
  const [errores, setErrores] = useState<Record<string, string>>({});

  const otsConSaldo = useOrdenesTrabajo(
    { pagina: 1, tamanio: 100, conSaldo: true },
    abierto && !editando && tipo === 'parcial_ot',
  );
  const otElegida = useOrdenTrabajo(
    abierto && tipo === 'parcial_ot' && otId !== '' ? otId : undefined,
  );

  const ot = otElegida.data;
  const hitoElegido = ot?.hitos.find((h) => h.id === hito);
  // Al editar, el disponible incluye lo que esta misma OC ya ocupa.
  const propioPorcentaje =
    editando && ordenCompra?.hito?.id === hito ? (ordenCompra?.porcentaje ?? 0) : 0;
  const disponible = hitoElegido ? hitoElegido.porcentajeDisponible + propioPorcentaje : null;
  const porcentaje =
    porcentajeEscrito ?? (disponible !== null ? String(disponible).replace('.', ',') : '');
  const pct = parsearPorcentaje(porcentaje);

  const totalesLineas = lineas.map((l) => {
    const cantidad = parsearCantidad(l.cantidad);
    return cantidad !== null && l.precioUnitario !== null
      ? Math.round(cantidad * l.precioUnitario)
      : null;
  });
  const netoEstimado =
    tipo === 'materiales'
      ? totalesLineas.reduce<number>((s, t) => s + (t ?? 0), 0)
      : ot && pct !== null
        ? montoDePorcentaje(ot.montoNeto, pct)
        : null;

  const cambiarLinea = <K extends keyof Omit<FilaLinea, 'clave'>>(
    clave: number,
    campo: K,
    valor: FilaLinea[K],
  ) =>
    setLineas((actuales) =>
      actuales.map((l) => (l.clave === clave ? { ...l, [campo]: valor } : l)),
    );

  const guardar = () => {
    const locales: Record<string, string> = {};
    if (fechaEntrega && fecha && fechaEntrega < fecha) {
      locales.fechaEntrega = 'La entrega no puede ser anterior a la fecha de la OC.';
    }
    if (tipo === 'materiales') {
      if (!obraSel) locales.obraId = 'Selecciona una obra.';
      if (!proveedor) locales.proveedorId = 'Selecciona un proveedor.';
      if (descripcion.trim().length < 2) locales.descripcion = 'Describe la compra.';
      lineas.forEach((l, i) => {
        if (l.descripcion.trim().length < 2)
          locales[`lineas.${i}.descripcion`] = 'Describe el ítem.';
        if (l.unidad.trim() === '') locales[`lineas.${i}.unidad`] = 'Indica la unidad.';
        const c = parsearCantidad(l.cantidad);
        if (c === null || c <= 0) locales[`lineas.${i}.cantidad`] = 'Cantidad mayor que cero.';
        if (l.precioUnitario === null) locales[`lineas.${i}.precioUnitario`] = 'Ingresa el precio.';
      });
    } else {
      if (otId === '') locales.ordenTrabajoId = 'Selecciona una OT aprobada.';
      if (hito === '') locales.hitoId = 'Selecciona un hito.';
      if (pct === null || pct <= 0 || Math.round(pct * 100) !== pct * 100) {
        locales.porcentaje = 'Porcentaje mayor que cero, hasta 2 decimales.';
      } else if (disponible !== null && pct > disponible) {
        locales.porcentaje = `El hito tiene disponible ${formatearPorcentaje(disponible)}.`;
      }
      if (descripcion.trim() !== '' && descripcion.trim().length < 2) {
        locales.descripcion = 'Describe la compra.';
      }
    }
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    const comun = {
      fecha,
      fechaEntrega: fechaEntrega || null,
      afectaIva,
      categoriaGastoId: categoriaGastoId === '' ? undefined : categoriaGastoId,
      descripcion: descripcion.trim() || undefined,
    };
    const lineasCuerpo = lineas.map((l) => ({
      descripcion: l.descripcion.trim(),
      unidad: l.unidad.trim(),
      cantidad: parsearCantidad(l.cantidad)!,
      precioUnitario: l.precioUnitario!,
    }));
    const alFallar = (error: unknown) => setErrores(erroresPorCampo(error));
    if (ordenCompra) {
      actualizar.mutate(
        {
          id: ordenCompra.id,
          version: ordenCompra.version,
          ...comun,
          ...(tipo === 'materiales'
            ? { proveedorId: proveedor!.id, lineas: lineasCuerpo }
            : { hitoId: hito as number, porcentaje: pct! }),
        },
        { onSuccess: (d) => onGuardada(d, false), onError: alFallar },
      );
    } else {
      crear.mutate(
        tipo === 'materiales'
          ? {
              tipo,
              obraId: obraSel!.id,
              proveedorId: proveedor!.id,
              ...comun,
              lineas: lineasCuerpo,
            }
          : {
              tipo,
              ordenTrabajoId: otId as number,
              hitoId: hito as number,
              porcentaje: pct!,
              ...comun,
            },
        { onSuccess: (d) => onGuardada(d, true), onError: alFallar },
      );
    }
  };

  const errorGeneral =
    mutacion.isError && Object.keys(erroresPorCampo(mutacion.error)).length === 0
      ? esConflictoVersion(mutacion.error)
        ? 'Otra persona modificó la OC. Cierra este formulario para ver los datos actuales.'
        : mensajeDeError(mutacion.error)
      : null;
  const opcionesOt =
    ot && !(otsConSaldo.data?.items ?? []).some((o) => o.id === ot.id)
      ? [ot, ...(otsConSaldo.data?.items ?? [])]
      : (otsConSaldo.data?.items ?? []);

  return (
    <Dialog
      open={abierto}
      onClose={mutacion.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id={idTitulo}>
        {ordenCompra ? `Editar ${ordenCompra.folio}` : 'Nueva orden de compra'}
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {!editando && (
          <ToggleButtonGroup
            exclusive
            value={tipo}
            onChange={(_e, valor: TipoOrdenCompra | null) => valor && setTipo(valor)}
            aria-label="Tipo de OC"
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="materiales">{ETIQUETA_TIPO_OC.materiales}</ToggleButton>
            <ToggleButton value="parcial_ot">{ETIQUETA_TIPO_OC.parcial_ot}</ToggleButton>
          </ToggleButtonGroup>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {tipo === 'materiales' ? (
            <>
              <SelectorObra
                label="Obra"
                value={obraSel}
                onChange={setObraSel}
                error={!!errores.obraId}
                helperText={errores.obraId}
                disabled={editando}
                required
              />
              <SelectorProveedor
                label="Proveedor"
                value={proveedor}
                onChange={setProveedor}
                error={!!errores.proveedorId}
                helperText={errores.proveedorId}
                required
              />
            </>
          ) : (
            <>
              <TextField
                select
                label="Orden de trabajo"
                value={otId}
                onChange={(e) => {
                  setOtId(e.target.value === '' ? '' : Number(e.target.value));
                  setHito('');
                  setPorcentaje(null);
                }}
                disabled={editando || ordenTrabajoId !== undefined}
                error={!!errores.ordenTrabajoId}
                helperText={
                  errores.ordenTrabajoId ??
                  (opcionesOt.length === 0 && !otsConSaldo.isFetching
                    ? 'No hay OT aprobadas con saldo.'
                    : 'OT aprobadas con saldo por ordenar.')
                }
                required
              >
                {opcionesOt.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.folio} · {o.proveedor.razonSocial} · saldo {formatCLP(o.saldo)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Hito"
                value={hito}
                onChange={(e) => {
                  const id = e.target.value === '' ? '' : Number(e.target.value);
                  setHito(id);
                  setPorcentaje(null);
                }}
                disabled={!ot}
                error={!!errores.hitoId}
                helperText={errores.hitoId}
                required
              >
                {(ot?.hitos ?? []).map((h) => (
                  <MenuItem
                    key={h.id}
                    value={h.id}
                    disabled={h.porcentajeDisponible <= 0 && h.id !== ordenCompra?.hito?.id}
                  >
                    {h.numero}. {h.descripcion} · disponible{' '}
                    {formatearPorcentaje(h.porcentajeDisponible)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Porcentaje de la OT"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                error={!!errores.porcentaje}
                helperText={
                  errores.porcentaje ??
                  (disponible !== null
                    ? `Disponible en el hito: ${formatearPorcentaje(disponible)}.`
                    : undefined)
                }
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                required
              />
              <Box sx={{ alignSelf: 'center' }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}
                >
                  Monto neto estimado
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 700 }} aria-live="polite">
                  {netoEstimado === null ? '—' : formatCLP(netoEstimado)}
                </Typography>
              </Box>
            </>
          )}
          <TextField
            label={tipo === 'materiales' ? 'Descripción' : 'Descripción (opcional)'}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={!!errores.descripcion}
            helperText={
              errores.descripcion ??
              (tipo === 'parcial_ot'
                ? 'Si la dejas vacía se usa el hito y el porcentaje.'
                : undefined)
            }
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{ gridColumn: { sm: '1 / -1' } }}
            required={tipo === 'materiales'}
          />
          <TextField
            label="Fecha de la OC"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            helperText={errores.fecha ?? 'Define la tasa de IVA vigente.'}
            error={!!errores.fecha}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Fecha de entrega"
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            error={!!errores.fechaEntrega}
            helperText={errores.fechaEntrega}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Categoría de gasto"
            value={categoriaGastoId}
            onChange={(e) =>
              setCategoriaGastoId(e.target.value === '' ? '' : Number(e.target.value))
            }
            error={!!errores.categoriaGastoId}
            helperText={
              errores.categoriaGastoId ??
              (tipo === 'materiales' ? 'Por defecto, «Materiales».' : 'Por defecto, la de la OT.')
            }
          >
            <MenuItem value="">Por defecto</MenuItem>
            {(categorias.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nombre}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox checked={afectaIva} onChange={(e) => setAfectaIva(e.target.checked)} />
            }
            label="Afecta a IVA"
          />
        </Box>

        {tipo === 'materiales' && (
          <Box sx={{ mt: 3 }} role="group" aria-label="Líneas de la OC">
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Líneas</Typography>
            {lineas.map((l, i) => (
              <Box
                key={l.clave}
                sx={{
                  display: 'grid',
                  gap: 1,
                  alignItems: 'start',
                  gridTemplateColumns: {
                    xs: '1fr 1fr auto',
                    sm: '2fr 90px 110px 150px 110px auto',
                  },
                  mb: 1,
                }}
              >
                <TextField
                  size="small"
                  label={`Ítem ${i + 1}`}
                  value={l.descripcion}
                  onChange={(e) => cambiarLinea(l.clave, 'descripcion', e.target.value)}
                  error={!!errores[`lineas.${i}.descripcion`]}
                  helperText={errores[`lineas.${i}.descripcion`]}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                  sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                />
                <TextField
                  size="small"
                  label="Unidad"
                  value={l.unidad}
                  onChange={(e) => cambiarLinea(l.clave, 'unidad', e.target.value)}
                  error={!!errores[`lineas.${i}.unidad`]}
                  helperText={errores[`lineas.${i}.unidad`]}
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />
                <TextField
                  size="small"
                  label="Cantidad"
                  value={l.cantidad}
                  onChange={(e) => cambiarLinea(l.clave, 'cantidad', e.target.value)}
                  error={!!errores[`lineas.${i}.cantidad`]}
                  helperText={errores[`lineas.${i}.cantidad`]}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <MoneyField
                  size="small"
                  label="Precio unitario"
                  value={l.precioUnitario}
                  onChange={(v) => cambiarLinea(l.clave, 'precioUnitario', v)}
                  error={!!errores[`lineas.${i}.precioUnitario`]}
                  helperText={errores[`lineas.${i}.precioUnitario`]}
                />
                <Typography sx={{ fontSize: 13, alignSelf: 'center', textAlign: 'right' }}>
                  {totalesLineas[i] === null ? '—' : formatCLP(totalesLineas[i])}
                </Typography>
                <IconButton
                  aria-label={`Quitar el ítem ${i + 1}`}
                  onClick={() =>
                    setLineas((actuales) => actuales.filter((x) => x.clave !== l.clave))
                  }
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Button
                size="small"
                startIcon={<AddOutlined />}
                onClick={() => setLineas((a) => [...a, lineaVacia()])}
              >
                Agregar ítem
              </Button>
              <Typography sx={{ fontSize: 14 }} aria-live="polite">
                Neto estimado: <strong>{formatCLP(netoEstimado)}</strong>
              </Typography>
            </Box>
          </Box>
        )}
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5 }}>
          Montos en CLP neto. El IVA (según el parámetro vigente a la fecha de la OC) y los totales
          definitivos los calcula el servidor.
        </Typography>
        {errorGeneral && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorGeneral}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} color="inherit" disabled={mutacion.isPending}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={guardar} disabled={mutacion.isPending}>
          {ordenCompra ? 'Guardar cambios' : 'Crear OC'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Se monta al abrir: cada apertura parte con el formulario limpio. */
export function OrdenCompraDialog(props: OrdenCompraDialogProps) {
  return props.abierto ? <OrdenCompraDialogAbierto {...props} /> : null;
}
