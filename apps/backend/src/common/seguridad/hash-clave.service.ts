import { Injectable } from '@nestjs/common';
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

// Parámetros recomendados por OWASP para argon2id (m=19 MiB, t=2, p=1).
const MEMORIA_KIB = 19_456;
const PASADAS = 2;
const PARALELISMO = 1;
const LARGO_ETIQUETA = 32;
const LARGO_SAL = 16;

interface ParametrosHash {
  memoria: number;
  pasadas: number;
  paralelismo: number;
  sal: Buffer;
  etiqueta: Buffer;
}

function derivar(
  clave: string,
  sal: Buffer,
  memoria: number,
  pasadas: number,
  paralelismo: number,
  largo: number,
): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    argon2(
      'argon2id',
      {
        message: Buffer.from(clave, 'utf8'),
        nonce: sal,
        parallelism: paralelismo,
        tagLength: largo,
        memory: memoria,
        passes: pasadas,
      },
      (error, derivada) => (error ? rechazar(error) : resolver(derivada)),
    );
  });
}

const b64 = (b: Buffer) => b.toString('base64').replace(/=+$/, '');

/** Lee un hash PHC `$argon2id$v=19$m=…,t=…,p=…$sal$etiqueta`. */
function leerPhc(hash: string): ParametrosHash | null {
  const partes = hash.split('$');
  if (partes.length !== 6 || partes[0] !== '' || partes[1] !== 'argon2id') {
    return null;
  }
  if (partes[2] !== 'v=19') return null;
  const parametros = /^m=(\d+),t=(\d+),p=(\d+)$/.exec(partes[3]);
  if (!parametros) return null;
  const sal = Buffer.from(partes[4], 'base64');
  const etiqueta = Buffer.from(partes[5], 'base64');
  if (sal.length < 8 || etiqueta.length < 16) return null;
  return {
    memoria: Number(parametros[1]),
    pasadas: Number(parametros[2]),
    paralelismo: Number(parametros[3]),
    sal,
    etiqueta,
  };
}

/**
 * Hash de contraseñas con argon2id (`node:crypto`, Node ≥ 24.7: sin
 * dependencias nativas). Formato PHC estándar.
 */
@Injectable()
export class HashClaveService {
  async hashear(clave: string): Promise<string> {
    const sal = randomBytes(LARGO_SAL);
    const etiqueta = await derivar(
      clave,
      sal,
      MEMORIA_KIB,
      PASADAS,
      PARALELISMO,
      LARGO_ETIQUETA,
    );
    return `$argon2id$v=19$m=${MEMORIA_KIB},t=${PASADAS},p=${PARALELISMO}$${b64(sal)}$${b64(etiqueta)}`;
  }

  /** `false` si el hash está malformado; la comparación es de tiempo constante. */
  async verificar(clave: string, hash: string): Promise<boolean> {
    const parametros = leerPhc(hash);
    if (!parametros) return false;
    try {
      const calculada = await derivar(
        clave,
        parametros.sal,
        parametros.memoria,
        parametros.pasadas,
        parametros.paralelismo,
        parametros.etiqueta.length,
      );
      return timingSafeEqual(calculada, parametros.etiqueta);
    } catch {
      return false;
    }
  }
}
