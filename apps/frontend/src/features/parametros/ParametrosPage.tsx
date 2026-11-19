import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import { CabeceraPagina } from '@/components/CabeceraPagina';
import { CatalogosTab } from './CatalogosTab';
import { ParametrosTab } from './ParametrosTab';
import { UfTab } from './UfTab';

type Pestana = 'parametros' | 'uf' | 'catalogos';

/** P27 — Parámetros del sistema, valor de la UF y catálogos (solo admin). */
export function ParametrosPage() {
  const [pestana, setPestana] = useState<Pestana>('parametros');
  return (
    <>
      <CabeceraPagina
        eyebrow="Administración"
        titulo="Parámetros financieros"
        descripcion="Configura el IVA, los plazos, el valor de la UF y los catálogos del sistema."
      />
      <Tabs
        value={pestana}
        onChange={(_e, valor: Pestana) => setPestana(valor)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Secciones de parámetros"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="parametros" label="Parámetros" />
        <Tab value="uf" label="Valor de la UF" />
        <Tab value="catalogos" label="Catálogos" />
      </Tabs>
      <Box role="tabpanel">
        {pestana === 'parametros' && <ParametrosTab />}
        {pestana === 'uf' && <UfTab />}
        {pestana === 'catalogos' && <CatalogosTab />}
      </Box>
    </>
  );
}
