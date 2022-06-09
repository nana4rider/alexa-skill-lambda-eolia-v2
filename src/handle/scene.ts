import { DateTime } from 'luxon';
import { v4 as uuid } from 'uuid';
import { handleCleaningActivate } from './cleaning';

/**
 * シーン有効
 *
 * @param request
 * @returns
 */
export async function handleChildSceneActivate(request: any) {
  const endpointId = request.directive.endpoint.endpointId as string;
  const [strDeviceId, childId] = endpointId.split('@');
  const deviceId = Number(strDeviceId);

  if (childId === 'Cleaning' || childId === 'NanoexCleaning') {
    await handleCleaningActivate(deviceId, childId);
  } else {
    throw new Error(`Undefined childId: ${childId}`);
  }

  return {
    'event': {
      'header': {
        'namespace': 'Alexa.SceneController',
        'name': 'ActivationStarted',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId,
      },
      'payload': {
        'cause': {
          'type': 'APP_INTERACTION'
        },
        'timestamp': DateTime.local().toISO()
      }
    },
    'context': {}
  };
}
