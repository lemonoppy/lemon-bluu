import 'dotenv/config';

import { logger } from 'src/lib/logger';
import { syncRiftboundEvents } from 'src/lib/uvs/sync';

const maxEvents = process.argv[2] ? Number(process.argv[2]) : undefined;

async function main() {
  logger.info(
    `Running Riftbound sync${
      maxEvents != null ? ` (max ${maxEvents} events)` : ''
    }...`,
  );
  const result = await syncRiftboundEvents(maxEvents);
  logger.info(`Sync complete: ${JSON.stringify(result)}`);
}

main().catch((error) => {
  logger.error(error, 'Riftbound sync failed');
  process.exit(1);
});
