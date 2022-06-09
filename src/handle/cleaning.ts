import { getApiClient } from './common';

/**
 * おそうじ/おでかけクリーン有効
 *
 * @param applianceId
 * @param operationMode
 */
export async function handleCleaningActivate(deviceId: number, operationMode: 'Cleaning' | 'NanoexCleaning') {
  const client = getApiClient();

  await client.executeCommand(deviceId, 'mode', {
    'value': operationMode
  });
}
