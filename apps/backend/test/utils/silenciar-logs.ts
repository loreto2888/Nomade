import { Logger } from '@nestjs/common';

// Las pruebas unitarias no necesitan el ruido del logger de Nest.
Logger.overrideLogger(false);
