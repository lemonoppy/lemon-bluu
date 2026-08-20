import 'dotenv/config';

import { processOttawaEvents } from 'src/lib/eloshowdown/service';
import { logger } from 'src/lib/logger';

const maxEvents = Number(process.argv[2] ?? 1);

async function main() {
  logger.info(`Running Ottawa events job (max ${maxEvents} events)...`);
  const result = await processOttawaEvents({ maxEvents });
  logger.info(`Job complete: ${JSON.stringify(result)}`);
}

main().catch((error) => {
  logger.error(error, 'Ottawa events job failed');
  process.exit(1);
});
