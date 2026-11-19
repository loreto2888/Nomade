import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { colorDeEstado } from './estados';
import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  it('asigna la semántica de color del plan: pendiente = advertencia, rechazado = error, cerrado = neutro', () => {
    expect(colorDeEstado('pendiente')).toBe('warning');
    expect(colorDeEstado('en_revision')).toBe('warning');
    expect(colorDeEstado('excepcion')).toBe('error');
    expect(colorDeEstado('rechazado')).toBe('error');
    expect(colorDeEstado('aprobado')).toBe('success');
    expect(colorDeEstado('cerrado')).toBe('default');
    expect(colorDeEstado('cerrada')).toBe('default');
  });

  it('cubre los estados de obra del catálogo base', () => {
    expect(colorDeEstado('en_preparacion')).toBe('info');
    expect(colorDeEstado('activa')).toBe('success');
    expect(colorDeEstado('suspendida')).toBe('warning');
    expect(colorDeEstado('terminada')).toBe('primary');
  });

  it('un estado desconocido (ítem agregado por el admin) usa el color neutro', () => {
    expect(colorDeEstado('en_garantia')).toBe('default');
  });

  it('muestra la etiqueta indicada o el código con formato legible', () => {
    const { rerender } = render(<StatusChip estado="activa" etiqueta="En ejecución" />);
    expect(screen.getByText('En ejecución')).toBeInTheDocument();
    rerender(<StatusChip estado="en_revision" />);
    expect(screen.getByText('En revision')).toBeInTheDocument();
  });

  it('el estado cerrado se dibuja con contorno', () => {
    render(<StatusChip estado="cerrada" etiqueta="Cerrada" />);
    expect(screen.getByText('Cerrada').closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });
});
