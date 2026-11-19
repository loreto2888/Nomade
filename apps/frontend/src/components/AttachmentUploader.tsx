import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useId, useRef, useState, type DragEvent } from 'react';
import {
  urlDescargaAdjunto,
  useAdjuntos,
  useEliminarAdjunto,
  useSubirAdjunto,
  type AdjuntoDto,
  type EntidadAdjuntable,
} from '@/api/adjuntos';
import { mensajeDeError } from '@/api/errores';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TIPOS_ACEPTADOS, validarArchivoCliente } from '@/lib/adjuntos';
import { formatearFechaHora, formatearTamanio } from '@/lib/formato';

interface AttachmentUploaderProps {
  entidadTipo: EntidadAdjuntable;
  entidadId: number;
  titulo?: string;
  /** Sin botón de subir ni de eliminar. */
  soloLectura?: boolean;
}

/**
 * Adjuntos de una obra, proveedor o cliente: lista con descarga, subida (botón o arrastrar y
 * soltar) y eliminación. Valida tipo y tamaño antes de enviar; el backend valida el contenido.
 * Reglas (D-16): PDF, JPG, PNG, XLSX o CSV, hasta 20 MB.
 */
export function AttachmentUploader({
  entidadTipo,
  entidadId,
  titulo = 'Adjuntos',
  soloLectura = false,
}: AttachmentUploaderProps) {
  const idEntrada = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const consulta = useAdjuntos(entidadTipo, entidadId);
  const subir = useSubirAdjunto(entidadTipo, entidadId);
  const eliminar = useEliminarAdjunto(entidadTipo, entidadId);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<AdjuntoDto | null>(null);

  const enviar = (archivo: File | undefined) => {
    if (!archivo) return;
    const problema = validarArchivoCliente(archivo);
    setErrorArchivo(problema);
    if (problema) return;
    subir.mutate({ archivo });
  };

  const alSoltar = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (!soloLectura) enviar(e.dataTransfer.files[0]);
  };

  const adjuntos = consulta.data ?? [];
  const error = errorArchivo ?? (subir.isError ? mensajeDeError(subir.error) : null);

  return (
    <Box component="section" aria-label={titulo}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontSize: 15 }}>
          {titulo}
        </Typography>
        {!soloLectura && (
          <>
            <input
              ref={entrada}
              id={idEntrada}
              type="file"
              hidden
              accept={TIPOS_ACEPTADOS}
              aria-label="Archivo a adjuntar"
              onChange={(e) => {
                enviar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={subir.isPending ? <CircularProgress size={16} /> : <AttachFileOutlined />}
              disabled={subir.isPending}
              onClick={() => entrada.current?.click()}
            >
              {subir.isPending ? 'Subiendo…' : 'Adjuntar archivo'}
            </Button>
          </>
        )}
      </Box>

      {!soloLectura && (
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          sx={{
            mt: 1.5,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: '1px dashed',
            borderColor: arrastrando ? 'primary.main' : 'divider',
            borderRadius: 1,
            bgcolor: arrastrando ? 'action.hover' : 'transparent',
            color: 'text.secondary',
            fontSize: 12,
          }}
        >
          <UploadFileOutlined fontSize="small" />
          Arrastra un archivo aquí o usa el botón. PDF, JPG, PNG, XLSX o CSV, hasta 20 MB.
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setErrorArchivo(null)}>
          {error}
        </Alert>
      )}
      {eliminar.isError && porEliminar === null && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {mensajeDeError(eliminar.error)}
        </Alert>
      )}
      {consulta.isError && (
        <Alert
          severity="error"
          sx={{ mt: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          {mensajeDeError(consulta.error)}
        </Alert>
      )}

      {consulta.isSuccess && adjuntos.length === 0 && (
        <Typography sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>
          Aún no hay archivos adjuntos.
        </Typography>
      )}

      {adjuntos.length > 0 && (
        <List
          dense
          disablePadding
          sx={{ mt: 1 }}
          aria-label={`Archivos de ${titulo.toLowerCase()}`}
        >
          {adjuntos.map((adjunto) => (
            <ListItem
              key={adjunto.id}
              divider
              disableGutters
              secondaryAction={
                !soloLectura && (
                  <IconButton
                    edge="end"
                    aria-label={`Eliminar ${adjunto.nombreOriginal}`}
                    onClick={() => setPorEliminar(adjunto)}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <DescriptionOutlined fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Link
                    href={urlDescargaAdjunto(adjunto.id)}
                    download={adjunto.nombreOriginal}
                    underline="hover"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {adjunto.nombreOriginal}
                    <FileDownloadOutlined sx={{ fontSize: 14 }} aria-hidden />
                  </Link>
                }
                secondary={`${formatearTamanio(adjunto.tamanioBytes)} · ${formatearFechaHora(adjunto.creadoEn)}${adjunto.descripcion ? ` · ${adjunto.descripcion}` : ''}`}
                slotProps={{ secondary: { sx: { fontSize: 12 } } }}
                sx={{ pr: 5 }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmDialog
        abierto={porEliminar !== null}
        titulo="Eliminar adjunto"
        descripcion={`Se quitará «${porEliminar?.nombreOriginal ?? ''}» de la lista. El archivo se conserva en el servidor.`}
        textoConfirmar="Eliminar"
        peligro
        pedirMotivo
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : null}
        onConfirmar={(motivo) => {
          if (!porEliminar) return;
          eliminar.mutate(
            { id: porEliminar.id, motivo },
            { onSuccess: () => setPorEliminar(null) },
          );
        }}
        onCancelar={() => {
          eliminar.reset();
          setPorEliminar(null);
        }}
      />
    </Box>
  );
}
