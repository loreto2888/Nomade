import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { useCatalogo, type CatalogoItemDto, type TipoCatalogo } from '@/api/catalogos';
import { mensajeDeError } from '@/api/errores';
import { ETIQUETA_CATALOGO, TIPOS_CATALOGO } from './catalogos';
import { FormularioCatalogoItem } from './FormularioCatalogoItem';

/** Administración de los catálogos editables (base provisoria hasta recibir los del cliente, H16). */
export function CatalogosTab() {
  const [tipo, setTipo] = useState<TipoCatalogo>('estado_obra');
  const consulta = useCatalogo(tipo, true);
  const [formulario, setFormulario] = useState<{ item?: CatalogoItemDto } | null>(null);
  const items = consulta.data ?? [];

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Catálogo base provisorio: se reemplazará o ajustará con los catálogos reales que entregue el
        cliente. Los ítems no se eliminan: se desactivan, y los marcados con candado los usa la
        aplicación (solo se puede cambiar su nombre).
      </Alert>

      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          mb: 2,
        }}
      >
        <TextField
          select
          size="small"
          label="Catálogo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCatalogo)}
          sx={{ minWidth: 240 }}
        >
          {TIPOS_CATALOGO.map((t) => (
            <MenuItem key={t} value={t}>
              {ETIQUETA_CATALOGO[t]}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setFormulario({})}>
          Agregar ítem
        </Button>
      </Box>

      {consulta.isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          {mensajeDeError(consulta.error)}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table aria-label={ETIQUETA_CATALOGO[tipo]}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Código</TableCell>
                <TableCell align="right">Orden</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {item.nombre}
                      {item.protegido && (
                        <LockOutlined
                          sx={{ fontSize: 14, color: 'text.secondary' }}
                          titleAccess="Ítem usado por la aplicación"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {item.codigo}
                  </TableCell>
                  <TableCell align="right">{item.orden}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={item.activo ? 'success' : 'default'}
                      label={item.activo ? 'Activo' : 'Inactivo'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Editar ${item.nombre}`}
                      onClick={() => setFormulario({ item })}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {consulta.isSuccess && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Este catálogo no tiene ítems.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <FormularioCatalogoItem
        abierto={formulario !== null}
        tipo={tipo}
        item={formulario?.item}
        onCerrar={() => setFormulario(null)}
        onGuardado={() => setFormulario(null)}
        onConflicto={() => {
          setFormulario(null);
          void consulta.refetch();
        }}
      />
    </>
  );
}
