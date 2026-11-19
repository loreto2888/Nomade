import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { rangoPagina } from '../../common/paginacion/pagina.js';
import { ValorUf } from './valor-uf.entity.js';

@Injectable()
export class UfRepositorio {
  constructor(
    @InjectRepository(ValorUf)
    private readonly repositorio: Repository<ValorUf>,
  ) {}

  buscarPorFecha(fecha: string): Promise<ValorUf | null> {
    return this.repositorio.findOne({ where: { fecha } });
  }

  /** Valores con fecha en el rango cerrado `[desde, hasta]`. */
  entre(desde: string, hasta: string): Promise<ValorUf[]> {
    return this.repositorio.find({ where: { fecha: Between(desde, hasta) } });
  }

  async listar(filtro: {
    desde?: string;
    hasta?: string;
    pagina: number;
    tamanio: number;
  }): Promise<[ValorUf[], number]> {
    const consulta = this.repositorio.createQueryBuilder('u');
    if (filtro.desde)
      consulta.andWhere('u.fecha >= :desde', { desde: filtro.desde });
    if (filtro.hasta)
      consulta.andWhere('u.fecha <= :hasta', { hasta: filtro.hasta });
    const { skip, take } = rangoPagina(filtro);
    return consulta
      .orderBy('u.fecha', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  guardar(valor: ValorUf): Promise<ValorUf> {
    return this.repositorio.save(valor);
  }

  crear(datos: Partial<ValorUf>): Promise<ValorUf> {
    return this.repositorio.save(this.repositorio.create(datos));
  }
}
