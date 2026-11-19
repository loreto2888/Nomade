import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Adjunto } from './adjunto.entity.js';
import { TABLA_DE_ENTIDAD, type EntidadAdjuntable } from './adjuntos.tipos.js';

@Injectable()
export class AdjuntosRepositorio {
  constructor(
    @InjectRepository(Adjunto)
    private readonly repositorio: Repository<Adjunto>,
    private readonly dataSource: DataSource,
  ) {}

  /** ¿Existe (y está vigente) la entidad a la que se quiere adjuntar? */
  async existeEntidad(tipo: EntidadAdjuntable, id: number): Promise<boolean> {
    const tabla = TABLA_DE_ENTIDAD[tipo];
    const filas = await this.dataSource.query<unknown[]>(
      `SELECT 1 FROM ${tabla} WHERE id = $1 AND eliminado_en IS NULL`,
      [id],
    );
    return filas.length > 0;
  }

  listarDeEntidad(tipo: EntidadAdjuntable, id: number): Promise<Adjunto[]> {
    return this.repositorio.find({
      where: { entidadTipo: tipo, entidadId: id, eliminadoEn: IsNull() },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  buscarPorId(id: number): Promise<Adjunto | null> {
    return this.repositorio.findOne({ where: { id, eliminadoEn: IsNull() } });
  }

  crear(datos: Partial<Adjunto>): Promise<Adjunto> {
    return this.repositorio.save(this.repositorio.create(datos));
  }

  guardar(adjunto: Adjunto): Promise<Adjunto> {
    return this.repositorio.save(adjunto);
  }
}
