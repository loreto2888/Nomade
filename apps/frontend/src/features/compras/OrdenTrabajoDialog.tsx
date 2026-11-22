import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import {
  useActualizarOrdenTrabajo,
  useCotizaciones,
  useCrearOrdenTrabajo,
  type CotizacionDto,
  type OrdenTrabajoDto,
} from '@/api/compras';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import {
  formatearPorcentaje,
  montoDePorcentaje,
  parsearPorcentaje,
  sumarPorcentajes,
} from '@/lib/compras';
import { formatCLP } from '@/lib/formato';

interface OrdenTrabajoDialogProps {
  abierto: boolean;
  /** OT a editar (borrador); sin ella se crea una nueva. */
  ordenTrabajo?: OrdenTrabajoDto;
  /** Cotización preseleccionada (desde su ficha). */
  cotizacion?: CotizacionDto;
  /** Limita las cotizaciones ofrecidas a una obra. */
  obraId?: number;
  onCerrar: () => void;
  onGuardada: (ot: OrdenTrabajoDto, creada: boolean) => void;
}

interface FilaHito {
  clave: number;
  descripcion: string;
  porcentaje: string;
  fechaEstimada: string;
}

let siguienteClave = 1;
const filaVacia = (porcentaje = ''): FilaHito => ({
  clave: siguienteClave++,
  descripcion: '',
  porcentaje,
  fechaEstimada: '',
});

/** Alta y edición de una OT: alcance, fechas e hitos porcentuales (deben sumar 100 % para enviar). */
function OrdenTrabajoDialogAbierto({
  abierto,
  ordenTrabajo,
  cotizacion,
  obraId,
  onCerrar,
  onGuardada,
}: OrdenTrabajoDialogProps) {
  const idTitulo = useId();
  const editando = ordenTrabajo !== undefined;
  const disponibles = useCotizaciones(
    { pagina: 1, tamanio: 100, disponiblesParaOt: true, obraId },
    abierto && !editando && !cotizacion,
  );
  const crear = useCrearOrdenTrabajo();
  const actualizar = useActualizarOrdenTrabajo();
  const mutacion = editando ? actualizar : crear;

  const [cotizacionId, setCotizacionId] = useState<number | ''>(cotizacion?.id ?? '');
  const [descripcion, setDescripcion] = useState(
    ordenTrabajo?.descripcion ?? cotizacion?.descripcion ?? '',
  );
  const [fechaInicio, setFechaInicio] = useState(ordenTrabajo?.fechaInicio ?? '');
  const [fechaTermino, setFechaTermino] = useState(ordenTrabajo?.fechaTermino ?? '');
  const [hitos, setHitos] = useState<FilaHito[]>(() =>
    ordenTrabajo && ordenTrabajo.hitos.length > 0
      ? ordenTrabajo.hitos.map((h) => ({
          clave: siguienteClave++,
          descripcion: h.descripcion,
          porcentaje: String(h.porcentaje).replace('.', ','),
          fechaEstimada: h.fechaEstimada ?? '',
        }))
      : [filaVacia('100')],
  );
  const [errores, setErrores] = useState<Record<string, string>>({});

  const opciones = cotizacion ? [cotizacion] : (disponibles.data?.items ?? []);
  const elegida = opciones.find((c) => c.id === cotizacionId);
  const montoBase = ordenTrabajo?.montoNeto ?? elegida?.montoNeto ?? null;
  const porcentajes = hitos.map((h) => parsearPorcentaje(h.porcentaje));
  const suma = sumarPorcentajes(porcentajes.map((p) => p ?? 0));

  const cambiarHito = (clave: number, campo: keyof Omit<FilaHito, 'clave'>, valor: string) =>
    setHitos((actuales) => actuales.map((h) => (h.clave === clave ? { ...h, [campo]: valor } : h)));

  const guardar = () => {
    const locales: Record<string, string> = {};
    if (!editando && cotizacionId === '')
      locales.cotizacionId = 'Selecciona una cotización aprobada.';
    if (descripcion.trim().length < 2) locales.descripcion = 'Describe el alcance de la OT.';
    if (fechaInicio && fechaTermino && fechaTermino < fechaInicio) {
      locales.fechaTermino = 'El término no puede ser anterior al inicio.';
    }
    hitos.forEach((h, i) => {
      if (h.descripcion.trim().length < 2) locales[`hitos.${i}.descripcion`] = 'Describe el hito.';
      const p = porcentajes[i];
      if (p === null || p <= 0 || p > 100 || Math.round(p * 100) !== p * 100) {
        locales[`hitos.${i}.porcentaje`] = 'Entre 0,01 y 100 (2 decimales).';
      }
    });
    if (suma > 100) locales.hitos = 'Los hitos no pueden superar el 100 %.';
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    const cuerpo = {
      descripcion: descripcion.trim(),
      fechaInicio: fechaInicio || null,
      fechaTermino: fechaTermino || null,
      hitos: hitos.map((h, i) => ({
        descripcion: h.descripcion.trim(),
        porcentaje: porcentajes[i]!,
        fechaEstimada: h.fechaEstimada || null,
      })),
    };
    const alFallar = (error: unknown) => setErrores(erroresPorCampo(error));
    if (ordenTrabajo) {
      actualizar.mutate(
        { id: ordenTrabajo.id, version: ordenTrabajo.version, ...cuerpo },
        { onSuccess: (ot) => onGuardada(ot, false), onError: alFallar },
      );
    } else {
      crear.mutate(
        { cotizacionId: cotizacionId as number, ...cuerpo },
        { onSuccess: (ot) => onGuardada(ot, true), onError: alFallar },
      );
    }
  };

  const errorGeneral =
    mutacion.isError && Object.keys(erroresPorCampo(mutacion.error)).length === 0
      ? esConflictoVersion(mutacion.error)
        ? 'Otra persona modificó la OT. Cierra este formulario para ver los datos actuales.'
        : mensajeDeError(mutacion.error)
      : null;

  return (
    <Dialog
      open={abierto}
      onClose={mutacion.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id={idTitulo}>
        {ordenTrabajo ? `Editar ${ordenTrabajo.folio}` : 'Nueva orden de trabajo'}
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {!editando && (
            <TextField
              select
              label="Cotización aprobada"
              value={cotizacionId}
              onChange={(e) => {
                const id = e.target.value === '' ? '' : Number(e.target.value);
                setCotizacionId(id);
                const c = opciones.find((x) => x.id === id);
                if (c && descripcion.trim() === '') setDescripcion(c.descripcion);
              }}
              disabled={!!cotizacion}
              error={!!errores.cotizacionId}
              helperText={
                errores.cotizacionId ??
                (opciones.length === 0 && !disponibles.isFetching
                  ? 'No hay cotizaciones aprobadas sin OT. Aprueba una cotización primero.'
                  : 'Solo cotizaciones aprobadas que aún no tienen OT.')
              }
              sx={{ gridColumn: { sm: '1 / -1' } }}
              required
            >
              {opciones.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.folio} · {c.proveedor.razonSocial} · {c.obra.nombre} · {formatCLP(c.montoNeto)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Alcance del trabajo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={!!errores.descripcion}
            helperText={errores.descripcion}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{ gridColumn: { sm: '1 / -1' } }}
            required
          />
          <TextField
            label="Inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Término"
            type="date"
            value={fechaTermino}
            onChange={(e) => setFechaTermino(e.target.value)}
            error={!!errores.fechaTermino}
            helperText={errores.fechaTermino}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        <Box sx={{ mt: 3 }} role="group" aria-label="Hitos de pago">
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Hitos de pago</Typography>
            <Typography
              sx={{ fontSize: 13, color: suma === 100 ? 'success.main' : 'warning.main' }}
              aria-live="polite"
            >
              Suman {formatearPorcentaje(suma)}
              {suma !== 100 && ' · deben sumar 100 % para enviar a revisión'}
            </Typography>
          </Box>
          {hitos.map((h, i) => (
            <Box
              key={h.clave}
              sx={{
                display: 'grid',
                gap: 1,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr 1fr auto', sm: '2fr 110px 150px 120px auto' },
                mb: 1,
              }}
            >
              <TextField
                size="small"
                label={`Hito ${i + 1}`}
                value={h.descripcion}
                onChange={(e) => cambiarHito(h.clave, 'descripcion', e.target.value)}
                error={!!errores[`hitos.${i}.descripcion`]}
                helperText={errores[`hitos.${i}.descripcion`]}
                slotProps={{ htmlInput: { maxLength: 200 } }}
                sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
              />
              <TextField
                size="small"
                label="%"
                value={h.porcentaje}
                onChange={(e) => cambiarHito(h.clave, 'porcentaje', e.target.value)}
                error={!!errores[`hitos.${i}.porcentaje`]}
                helperText={errores[`hitos.${i}.porcentaje`]}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', 'aria-label': `Porcentaje del hito ${i + 1}` },
                }}
              />
              <TextField
                size="small"
                label="Fecha estimada"
                type="date"
                value={h.fechaEstimada}
                onChange={(e) => cambiarHito(h.clave, 'fechaEstimada', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Typography
                sx={{ fontSize: 13, alignSelf: 'center', display: { xs: 'none', sm: 'block' } }}
              >
                {montoBase !== null && porcentajes[i] !== null
                  ? formatCLP(montoDePorcentaje(montoBase, porcentajes[i]))
                  : '—'}
              </Typography>
              <IconButton
                aria-label={`Quitar el hito ${i + 1}`}
                onClick={() => setHitos((actuales) => actuales.filter((x) => x.clave !== h.clave))}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddOutlined />}
            onClick={() =>
              setHitos((actuales) => [
                ...actuales,
                filaVacia(
                  suma < 100 ? String(Math.round((100 - suma) * 100) / 100).replace('.', ',') : '',
                ),
              ])
            }
          >
            Agregar hito
          </Button>
          {(errores.hitos || montoBase !== null) && (
            <Typography
              sx={{ fontSize: 12, color: errores.hitos ? 'error.main' : 'text.secondary', mt: 1 }}
            >
              {errores.hitos ??
                `Monto de la OT: ${formatCLP(montoBase)} (el de la cotización). Los montos de los hitos los calcula el servidor.`}
            </Typography>
          )}
        </Box>
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
          {ordenTrabajo ? 'Guardar cambios' : 'Crear OT'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Se monta al abrir: cada apertura parte con el formulario limpio. */
export function OrdenTrabajoDialog(props: OrdenTrabajoDialogProps) {
  return props.abierto ? <OrdenTrabajoDialogAbierto {...props} /> : null;
}
