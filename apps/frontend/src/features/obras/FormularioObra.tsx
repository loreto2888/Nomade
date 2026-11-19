import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useCatalogo } from '@/api/catalogos';
import { useClientes } from '@/api/clientes';
import {
  erroresPorCampo,
  esConflictoVersion,
  mensajeDeError,
  normalizarError,
} from '@/api/errores';
import { useActualizarObra, useCargarObra, useCrearObra, type ObraDto } from '@/api/obras';
import { useValorUf } from '@/api/parametros';
import { ConflictDialog, type DiferenciaConflicto } from '@/components/ConflictDialog';
import { MoneyField } from '@/components/MoneyField';
import { formatCLP, formatUF, formatearFecha } from '@/lib/formato';
import { useValorDiferido } from '@/lib/useValorDiferido';
import {
  OBRA_VACIA,
  aCambios,
  aCuerpoCrear,
  deObra,
  diferenciasConServidor,
  esquemaObra,
  fusionarEdiciones,
  type DatosObra,
  type OpcionCliente,
} from './esquemas';

interface FormularioObraProps {
  /** Obra a editar; sin ella, el formulario crea una nueva. */
  obra?: ObraDto;
  onGuardada: (obra: ObraDto, creada: boolean) => void;
  onCancelar: () => void;
}

/** Alta y edición de obras / centros de costo (P04). */
export function FormularioObra({ obra, onGuardada, onCancelar }: FormularioObraProps) {
  const editando = obra !== undefined;
  const crear = useCrearObra();
  const actualizar = useActualizarObra();
  const cargarObra = useCargarObra();
  const mutacion = editando ? actualizar : crear;

  // Obra "base": la versión contra la que se compara y se envía `version`. Cambia tras un conflicto.
  const [base, setBase] = useState<ObraDto | undefined>(obra);
  const [conflicto, setConflicto] = useState<{
    servidor: ObraDto;
    diferencias: DiferenciaConflicto[];
  } | null>(null);
  const cerrada = base?.estado.codigo === 'cerrada';

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<DatosObra>({
    resolver: zodResolver(esquemaObra),
    defaultValues: obra ? deObra(obra) : OBRA_VACIA,
  });

  // Estados: solo los activos (más el actual, aunque esté inactivo) y nunca «cerrada».
  const estados = useCatalogo('estado_obra');
  const opcionesEstado = useMemo(() => {
    const lista = (estados.data ?? []).filter((e) => e.codigo !== 'cerrada');
    if (base && !lista.some((e) => e.id === base.estado.id)) {
      lista.push({
        id: base.estado.id,
        tipo: 'estado_obra',
        codigo: base.estado.codigo,
        nombre: base.estado.nombre,
        descripcion: null,
        orden: 999,
        activo: true,
        protegido: false,
        version: 1,
      });
    }
    return lista;
  }, [estados.data, base]);

  // En una obra nueva, el estado inicial es «en preparación».
  useEffect(() => {
    if (editando || getValues('estadoId') !== null) return;
    const inicial = estados.data?.find((e) => e.codigo === 'en_preparacion');
    if (inicial) setValue('estadoId', inicial.id);
  }, [editando, estados.data, getValues, setValue]);

  // Cliente: búsqueda en el servidor mientras se escribe.
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const qCliente = useValorDiferido(busquedaCliente.trim());
  const clientes = useClientes({ pagina: 1, tamanio: 20, q: qCliente || undefined });
  const clienteActual = useWatch({ control, name: 'cliente' });
  const opcionesCliente: OpcionCliente[] = useMemo(() => {
    const lista = (clientes.data?.items ?? []).map((c) => ({
      id: c.id,
      rut: c.rut,
      razonSocial: c.razonSocial,
    }));
    if (clienteActual && !lista.some((c) => c.id === clienteActual.id))
      lista.unshift(clienteActual);
    return lista;
  }, [clientes.data, clienteActual]);

  // UF: vista previa del equivalente en pesos al valor de hoy.
  const moneda = useWatch({ control, name: 'monedaContrato' });
  const monto = useWatch({ control, name: 'montoContrato' });
  const ufHoy = useValorUf(undefined, moneda === 'UF');
  const ufSinValor = moneda === 'UF' && ufHoy.isError;
  const falta = ufSinValor && monto !== null;

  const alFallar = async (error: unknown) => {
    if (esConflictoVersion(error) && base) {
      try {
        const servidor = await cargarObra(base.id);
        setConflicto({
          servidor,
          diferencias: diferenciasConServidor(getValues(), deObra(base), servidor),
        });
      } catch {
        setError('root', {
          message: 'Otra persona modificó la obra y no se pudo recargar. Intenta de nuevo.',
        });
      }
      return;
    }
    const campos = erroresPorCampo(error);
    const mapa: Record<string, keyof DatosObra> = { clienteId: 'cliente' };
    for (const [campo, mensaje] of Object.entries(campos)) {
      const destino = (mapa[campo] ?? campo) as keyof DatosObra;
      if (destino in OBRA_VACIA) setError(destino, { message: mensaje });
    }
    if (normalizarError(error).codigo === 'CENTRO_COSTO_DUPLICADO' && !campos.codigoCentroCosto) {
      setError('codigoCentroCosto', { message: normalizarError(error).mensaje });
    }
  };

  const enviar = handleSubmit((datos) => {
    if (base) {
      const cambios = aCambios(datos, deObra(base));
      if (Object.keys(cambios).length === 0) {
        onCancelar();
        return;
      }
      actualizar.mutate(
        { id: base.id, version: base.version, ...cambios },
        { onSuccess: (o) => onGuardada(o, false), onError: (e) => void alFallar(e) },
      );
    } else {
      crear.mutate(aCuerpoCrear(datos), {
        onSuccess: (o) => onGuardada(o, true),
        onError: (e) => void alFallar(e),
      });
    }
  });

  const errorGeneral =
    mutacion.isError &&
    !esConflictoVersion(mutacion.error) &&
    Object.keys(erroresPorCampo(mutacion.error)).length === 0
      ? mensajeDeError(mutacion.error)
      : (errors.root?.message ?? null);

  return (
    <>
      <form
        onSubmit={(e) => void enviar(e)}
        noValidate
        aria-label={editando ? 'Editar obra' : 'Nueva obra'}
      >
        <Card>
          <CardContent sx={{ display: 'grid', gap: 3 }}>
            {cerrada && (
              <Alert severity="info">
                La obra está cerrada: solo se puede consultar, no modificar.
              </Alert>
            )}
            <Box
              component="fieldset"
              disabled={cerrada}
              sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: 'grid', gap: 3 }}
            >
              <Typography variant="h6" component="h2" sx={{ fontSize: 15 }}>
                Datos de la obra
              </Typography>
              <Box
                sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' } }}
              >
                <TextField
                  label="Centro de costo"
                  required
                  fullWidth
                  autoComplete="off"
                  placeholder="CC-001"
                  error={Boolean(errors.codigoCentroCosto)}
                  helperText={errors.codigoCentroCosto?.message ?? 'Único por obra. Ej.: CC-001.'}
                  slotProps={{
                    htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 20 },
                  }}
                  {...register('codigoCentroCosto')}
                />
                <TextField
                  label="Nombre de la obra"
                  required
                  fullWidth
                  autoComplete="off"
                  placeholder="Ej. Local Parque Norte"
                  error={Boolean(errors.nombre)}
                  helperText={errors.nombre?.message}
                  {...register('nombre')}
                />
                <Controller
                  name="cliente"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete<OpcionCliente>
                      value={field.value}
                      options={opcionesCliente}
                      loading={clientes.isFetching}
                      loadingText="Buscando…"
                      noOptionsText="Sin resultados"
                      filterOptions={(opciones) => opciones}
                      getOptionLabel={(c) => c.razonSocial}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      onChange={(_e, valor) => field.onChange(valor)}
                      onInputChange={(_e, texto, motivo) => {
                        if (motivo === 'input') setBusquedaCliente(texto);
                      }}
                      onBlur={field.onBlur}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cliente"
                          required
                          inputRef={field.ref}
                          error={Boolean(errors.cliente)}
                          helperText={errors.cliente?.message}
                        />
                      )}
                    />
                  )}
                />
                <Controller
                  name="estadoId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Estado"
                      fullWidth
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                      }
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={Boolean(errors.estadoId)}
                      helperText={errors.estadoId?.message}
                    >
                      {opcionesEstado.map((e) => (
                        <MenuItem key={e.id} value={e.id}>
                          {e.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Responsable"
                  fullWidth
                  autoComplete="off"
                  placeholder="Ej. Camila Rojas"
                  error={Boolean(errors.responsable)}
                  helperText={errors.responsable?.message}
                  {...register('responsable')}
                />
                <TextField
                  label="Dirección"
                  fullWidth
                  autoComplete="off"
                  error={Boolean(errors.direccion)}
                  helperText={errors.direccion?.message}
                  {...register('direccion')}
                />
                <TextField
                  label="Fecha de inicio"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.fechaInicio)}
                  helperText={errors.fechaInicio?.message}
                  {...register('fechaInicio')}
                />
                <TextField
                  label="Fecha de término"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.fechaTermino)}
                  helperText={errors.fechaTermino?.message}
                  {...register('fechaTermino')}
                />
              </Box>

              <Typography variant="h6" component="h2" sx={{ fontSize: 15 }}>
                Contrato
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
                  alignItems: 'start',
                }}
              >
                <Controller
                  name="monedaContrato"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      color="primary"
                      value={field.value}
                      onChange={(_e, valor: 'CLP' | 'UF' | null) => {
                        if (valor) field.onChange(valor);
                      }}
                      aria-label="Moneda del contrato"
                      sx={{ height: 40 }}
                    >
                      <ToggleButton value="CLP">Pesos (CLP)</ToggleButton>
                      <ToggleButton value="UF">UF</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
                <Controller
                  name="montoContrato"
                  control={control}
                  render={({ field }) => (
                    <MoneyField
                      label={
                        moneda === 'UF' ? 'Monto del contrato (UF)' : 'Monto del contrato (CLP)'
                      }
                      moneda={moneda}
                      fullWidth
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={Boolean(errors.montoContrato)}
                      helperText={
                        errors.montoContrato?.message ??
                        (moneda === 'UF'
                          ? 'Hasta 4 decimales; se usa la coma como separador.'
                          : 'Pesos chilenos, sin decimales.')
                      }
                    />
                  )}
                />
              </Box>
              {moneda === 'UF' && monto !== null && ufHoy.data && (
                <Alert severity="info" variant="outlined">
                  {formatUF(monto)} equivalen hoy a{' '}
                  {formatCLP(Math.round(monto * ufHoy.data.valor))} (UF a{' '}
                  {formatCLP(ufHoy.data.valor)} del {formatearFecha(ufHoy.data.fecha)}). El
                  equivalente en pesos que queda guardado usa el valor de la UF del día en que se
                  guarda el monto.
                </Alert>
              )}
              {falta && (
                <Alert severity="warning">
                  No hay un valor de la UF cargado para hoy. Pide a un administrador que lo cargue
                  en Parámetros para guardar un contrato en UF.
                </Alert>
              )}

              <TextField
                label="Observaciones"
                multiline
                minRows={2}
                fullWidth
                error={Boolean(errors.observaciones)}
                helperText={errors.observaciones?.message}
                {...register('observaciones')}
              />
            </Box>

            {errorGeneral && <Alert severity="error">{errorGeneral}</Alert>}

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button onClick={onCancelar} color="inherit" disabled={mutacion.isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={mutacion.isPending || cerrada || falta}
              >
                {editando ? 'Guardar cambios' : 'Guardar obra'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </form>

      <ConflictDialog
        abierto={conflicto !== null}
        entidad="la obra"
        diferencias={conflicto?.diferencias}
        onUsarActual={() => {
          if (!conflicto) return;
          setBase(conflicto.servidor);
          reset(deObra(conflicto.servidor));
          actualizar.reset();
          setConflicto(null);
        }}
        onConservarMios={() => {
          if (!conflicto || !base) return;
          // Los campos que la persona editó se mantienen; los demás quedan como los dejó la otra
          // persona. El próximo guardado va contra la versión vigente y solo envía lo editado.
          reset(fusionarEdiciones(getValues(), deObra(base), deObra(conflicto.servidor)));
          setBase(conflicto.servidor);
          actualizar.reset();
          setConflicto(null);
        }}
        onCerrar={() => setConflicto(null)}
      />
    </>
  );
}
