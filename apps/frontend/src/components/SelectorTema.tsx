import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useModoTema } from '@/app/tema/contextoTema';
import type { ModoTema } from '@/app/theme';

interface SelectorTemaProps {
  /** Se llama tras cambiar el modo (por ejemplo, para guardarlo en la cuenta del usuario). */
  onCambio?: (modo: ModoTema) => void;
}

/** Alterna entre tema claro y oscuro (D-12). La preferencia se recuerda en el navegador. */
export function SelectorTema({ onCambio }: SelectorTemaProps) {
  const { modo, establecerModo } = useModoTema();
  const oscuro = modo === 'oscuro';
  const etiqueta = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <Tooltip title={etiqueta}>
      <IconButton
        aria-label={etiqueta}
        aria-pressed={oscuro}
        onClick={() => {
          const siguiente: ModoTema = oscuro ? 'claro' : 'oscuro';
          establecerModo(siguiente);
          onCambio?.(siguiente);
        }}
        sx={{ color: 'apoyo.iconoBarra' }}
      >
        {oscuro ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
