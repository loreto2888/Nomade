import { Entity } from 'typeorm';
import { EntidadContraparte } from '../../common/maestros/contraparte.entity.js';

@Entity({ name: 'cliente', schema: 'nomade' })
export class Cliente extends EntidadContraparte {}
