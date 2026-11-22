import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useId, useState } from 'react';
import { useCatalogo } from '@/api/catalogos';
import { useActualizarCotizacion, useCrearCotizacion, type CotizacionDto } from '@/api/compras';
import { erroresPorCampo, esConflictoVersion, mensajeDeError } from '@/api/errores';
import { MoneyField } from '@/components/MoneyField';
import { SelectorObra, SelectorProveedor, type Opcion } from './Selectores';

interface CotizacionDialogProps {
  abierto: boolean;
  /** Cotización a editar; sin ella, se registra una nueva. */
  cotizacion?: CotizacionDto;
  /** Obra preseleccionada (desde la ficha de la obra). */
  obra?: Opcion;
  onCerrar: () => void;
  onGuardada: (cotizacion: CotizacionDto, creada: boolean) => void;
}

interface Formulario {
  obra: Opcion | null;
  proveedor: Opcion | null;
  referenciaProveedor: string;
  fecha: string;
  validezHasta: string;
  descripcion: string;
  categoriaGastoId: number | '';
  montoNeto: number | null;
}

const hoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

function inicial(c: CotizacionDto | undefined, obra: Opcion | undefined): Formulario {
  if (!c) {
    return {
      obra: obra ?? null,
      proveedor: null,
      referenciaProveedor: '',
      fecha: hoy(),
      validezHasta: '',
      descripcion: '',
      categoriaGastoId: '',
      montoNeto: null,
    };
  }
  return {
    obra: { id: c.obra.id, etiqueta: c.obra.nombre, detalle: c.obra.codigoCentroCosto },
    proveedor: { id: c.proveedor.id, etiqueta: c.proveedor.razonSocial, detalle: c.proveedor.rut },
    referenciaProveedor: c.referenciaProveedor ?? '',
    fecha: c.fecha,
    validezHasta: c.validezHasta ?? '',
    descripcion: c.descripcion,
    categoriaGastoId: c.categoria.id,
    montoNeto: c.montoNeto,
  };
}

function validar(f: Formulario): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!f.obra) errores.obraId = 'Selecciona una obra.';
  if (!f.proveedor) errores.proveedorId = 'Selecciona un proveedor.';
  if (!f.fecha) errores.fecha = 'Indica la fecha de la cotización.';
  if (f.validezHasta && f.fecha && f.validezHasta < f.fecha) {
    errores.validezHasta = 'La validez no puede ser anterior a la fecha.';
  }
  if (f.descripcion.trim().length < 2)
    errores.descripcion = 'Describe el alcance de la cotización.';
  if (f.montoNeto === null || f.montoNeto <= 0) errores.montoNeto = 'Ingresa el monto neto.';
  return errores;
}

/** Registro y edición de una cotización (borrador). */
function CotizacionDialogAbierto({
  abierto,
  cotizacion,
  obra,
  onCerrar,
  onGuardada,
}: CotizacionDialogProps) {
  const idTitulo = useId();
  const categorias = useCatalogo('categoria_gasto');
  const crear = useCrearCotizacion();
  const actualizar = useActualizarCotizacion();
  const mutacion = cotizacion ? actualizar : crear;
  const [f, setF] = useState<Formulario>(() => inicial(cotizacion, obra));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setF((actual) => ({ ...actual, [campo]: valor }));

  const guardar = () => {
    const locales = validar(f);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    const cuerpo = {
      obraId: f.obra!.id,
      proveedorId: f.proveedor!.id,
      referenciaProveedor: f.referenciaProveedor.trim() || null,
      fecha: f.fecha,
      validezHasta: f.validezHasta || null,
      descripcion: f.descripcion.trim(),
      categoriaGastoId: f.categoriaGastoId === '' ? undefined : f.categoriaGastoId,
      montoNeto: f.montoNeto!,
    };
    const alFallar = (error: unknown) => setErrores(erroresPorCampo(error));
    if (cotizacion) {
      actualizar.mutate(
        { id: cotizacion.id, version: cotizacion.version, ...cuerpo },
        { onSuccess: (c) => onGuardada(c, false), onError: alFallar },
      );
    } else {
      crear.mutate(cuerpo, { onSuccess: (c) => onGuardada(c, true), onError: alFallar });
    }
  };

  const errorGeneral =
    mutacion.isError && Object.keys(erroresPorCampo(mutacion.error)).length === 0
      ? esConflictoVersion(mutacion.error)
        ? 'Otra persona modificó la cotización. Cierra este formulario para ver los datos actuales.'
        : mensajeDeError(mutacion.error)
      : null;

  return (
    <Dialog
      open={abierto}
      onClose={mutacion.isPending ? undefined : onCerrar}
      aria-labelledby={idTitulo}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={idTitulo}>
        {cotizacion ? `Editar cotización ${cotizacion.folio}` : 'Nueva cotización'}
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <SelectorObra
              label="Obra"
              value={f.obra}
              onChange={(o) => cambiar('obra', o)}
              error={!!errores.obraId}
              helperText={errores.obraId}
              required
            />
          </Box>
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <SelectorProveedor
              label="Proveedor"
              value={f.proveedor}
              onChange={(o) => cambiar('proveedor', o)}
              error={!!errores.proveedorId}
              helperText={errores.proveedorId}
              required
            />
          </Box>
          <TextField
            label="Descripción / alcance"
            value={f.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            error={!!errores.descripcion}
            helperText={errores.descripcion}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{ gridColumn: { sm: '1 / -1' } }}
            required
          />
          <MoneyField
            label="Monto neto (CLP)"
            value={f.montoNeto}
            onChange={(v) => cambiar('montoNeto', v)}
            error={!!errores.montoNeto}
            helperText={errores.montoNeto ?? 'Sin IVA.'}
            required
          />
          <TextField
            select
            label="Categoría de gasto"
            value={f.categoriaGastoId}
            onChange={(e) =>
              cambiar('categoriaGastoId', e.target.value === '' ? '' : Number(e.target.value))
            }
            error={!!errores.categoriaGastoId}
            helperText={errores.categoriaGastoId ?? 'Por defecto, «Subcontratos».'}
          >
            <MenuItem value="">Por defecto</MenuItem>
            {(categorias.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha"
            type="date"
            value={f.fecha}
            onChange={(e) => cambiar('fecha', e.target.value)}
            error={!!errores.fecha}
            helperText={errores.fecha}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            label="Válida hasta"
            type="date"
            value={f.validezHasta}
            onChange={(e) => cambiar('validezHasta', e.target.value)}
            error={!!errores.validezHasta}
            helperText={errores.validezHasta}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Referencia del proveedor"
            value={f.referenciaProveedor}
            onChange={(e) => cambiar('referenciaProveedor', e.target.value)}
            helperText={errores.referenciaProveedor ?? 'Número que usa el proveedor (opcional).'}
            error={!!errores.referenciaProveedor}
            slotProps={{ htmlInput: { maxLength: 60 } }}
          />
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
          {cotizacion ? 'Guardar cambios' : 'Registrar cotización'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Se monta al abrir: cada apertura parte con el formulario limpio. */
export function CotizacionDialog(props: CotizacionDialogProps) {
  return props.abierto ? <CotizacionDialogAbierto {...props} /> : null;
}
