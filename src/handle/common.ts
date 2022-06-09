import { EoliaOperationMode } from 'panasonic-eolia-ts';
import { env } from 'process';
import { v4 as uuid } from 'uuid';
import { ApiClient } from '../ApiClient';
import { AlexaThermostatMode } from '../model/AlexaThermostatMode';
import { createThermostatReports } from './thermostat';

let apiClient: ApiClient | undefined = undefined;

export function getApiClient() {
  if (!apiClient) {
    apiClient = new ApiClient(env.API_URL!, env.API_KEY!);
  }
  return apiClient;
}


/**
 * Alexa操作モードを取得します。
 *
 * @param mode Eolia操作モード
 * @returns
 */
export function getAlexaThermostatMode(mode: EoliaOperationMode): AlexaThermostatMode {
  switch (mode) {
  case 'Auto':
    return 'AUTO';
  case 'Cooling':
  case 'CoolDehumidifying': // 冷房除湿もAlexaの扱いは冷房とする
    return 'COOL';
  case 'Heating':
    return 'HEAT';
  case 'Stop':
    return 'OFF';
  }
  return 'CUSTOM';
}

/**
 * Eolia操作モードを取得します。
 *
 * @param mode Alexa操作モード
 * @param customName カスタム名
 * @returns
 */
export function getEoliaOperationMode(mode: AlexaThermostatMode, customName: string): EoliaOperationMode | undefined {
  switch (mode) {
  case 'AUTO':
    return 'Auto';
  case 'COOL':
    return 'Cooling';
  case 'HEAT':
    return 'Heating';
  case 'FAN':
    return 'Blast';
  case 'DEHUMIDIFY':
    return 'CoolDehumidifying';
  case 'CUSTOM':
    // 現状、衣類乾燥や除湿(冷房ではない)は未対応
    switch (customName) {
    case 'DEHUMIDIFY': // 発話: 除湿
      return 'CoolDehumidifying';
    case 'FAN': // 発話: 送風
      return 'Blast';
    }
    console.log('[Custom Operation Mode]', mode);
    break;
  case 'OFF':
    return 'Stop';
  }
  return undefined;
}

/**
 * 認証
 *
 * @param request
 * @returns
 */
export async function handleAcceptGrant(request: any) {
  return {
    'event': {
      'header': {
        'namespace': 'Alexa.Authorization',
        'name': 'AcceptGrant.Response',
        'payloadVersion': '3',
        'messageId': uuid()
      },
      'payload': {}
    }
  };
}

/**
 * 状態レポート
 *
 * @param request
 * @returns
 */
export async function handleReportState(request: any) {
  const endpointId = request.directive.endpoint.endpointId as string;
  const deviceId = Number(endpointId);

  const client = getApiClient();
  const device = await client.getDeviceStatus(deviceId);

  return {
    'event': {
      'header': {
        'namespace': 'Alexa',
        'name': 'StateReport',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId
      },
      'payload': {}
    },
    'context': {
      'properties': createThermostatReports(device, 0)
    }
  };
}
