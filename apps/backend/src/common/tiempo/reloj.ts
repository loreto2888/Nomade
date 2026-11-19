import { Injectable } from '@nestjs/common';

const ZONA_CHILE = 'America/Santiago';

const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CHILE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha `YYYY-MM-DD` de un instante según la hora de Chile continental. */
export function fechaChile(instante: Date): string {
  return formatoFecha.format(instante);
}

/** `true` si el texto es una fecha de calendario `YYYY-MM-DD` existente. */
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto)
  );
}

/** Fuente del "ahora": inyectable para poder fijar la fecha en las pruebas. */
@Injectable()
export class Reloj {
  ahora(): Date {
    return new Date();
  }

  /** Fecha de hoy (`YYYY-MM-DD`) en Chile. */
  hoy(): string {
    return fechaChile(this.ahora());
  }
}
