import { DateTime } from 'luxon';
import { EoliaClient, EoliaTemperatureError, EoliaWindVolume } from 'panasonic-eolia-ts';
import { v4 as uuid } from 'uuid';
import { DeviceStatus } from '../ApiClient';
import { AlexaThermostatMode } from '../model/AlexaThermostatMode';
import { getAlexaThermostatMode, getApiClient, getEoliaOperationMode } from './common';

/**
 * 温度指定(絶対値)
 * https://developer.amazon.com/ja-JP/docs/alexa/device-apis/alexa-thermostatcontroller.html#settargettemperature-directive
 *
 * @param request
 * @returns
 */
export async function handleSetTargetTemperature(request: any) {
  const endpointId = request.directive.endpoint.endpointId as string;
  const deviceId = Number(endpointId);

  const client = getApiClient();
  const device = await client.getDeviceStatus(deviceId);

  const targetSetpoint: number = request.directive.payload.targetSetpoint.value;

  // 設定範囲外の温度で、風量を設定させる隠しコマンド(ThermostatControllerに風量がサポートされたら移行)
  // 50:自動 51~54:風量 55:パワフル
  const baseWindTemp = 50;
  if (targetSetpoint === baseWindTemp) {
    await client.executeCommand(deviceId, {
      wind_volume: 0
    });
  } else if (targetSetpoint >= baseWindTemp + 1 && targetSetpoint <= baseWindTemp + 4) {
    const windVolume = targetSetpoint - baseWindTemp + 1 as EoliaWindVolume;
    await client.executeCommand(deviceId, {
      wind_volume: windVolume
    });
  } else if (targetSetpoint === baseWindTemp + 5) {
    await client.executeCommand(deviceId, {
      air_flow: 'powerful'
    });
  } else {
    // 本来の処理
    if (targetSetpoint < EoliaClient.MIN_TEMPERATURE || targetSetpoint > EoliaClient.MAX_TEMPERATURE) {
      throw new EoliaTemperatureError(targetSetpoint);
    }

    await client.executeCommand(deviceId, {
      operation_status: true,
      temperature: targetSetpoint
    });

    if (!device.status.operation_status) {
      device.status.operation_mode = device.lastMode ?? 'Auto';
    }
    device.status.temperature = targetSetpoint;
  }

  return {
    'event': {
      'header': {
        'namespace': 'Alexa',
        'name': 'Response',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId,
      },
      'payload': {},
    },
    'context': {
      'properties': createThermostatReports(device, 0)
    }
  };
}

/**
 * 温度指定(相対値)
 * https://developer.amazon.com/ja-JP/docs/alexa/device-apis/alexa-thermostatcontroller.html#adjusttargettemperature-directive
 *
 * @param request
 * @returns
 */
export async function handleAdjustTargetTemperature(request: any) {
  const endpointId = request.directive.endpoint.endpointId as string;
  const deviceId = Number(endpointId);

  const client = getApiClient();
  const device = await client.getDeviceStatus(deviceId);

  const targetSetpointDelta: number = request.directive.payload.targetSetpointDelta.value;
  const targetSetpoint: number = device.status.temperature + targetSetpointDelta;
  if (targetSetpoint < EoliaClient.MIN_TEMPERATURE || targetSetpoint > EoliaClient.MAX_TEMPERATURE) {
    throw new EoliaTemperatureError(targetSetpoint);
  }

  await client.executeCommand(deviceId, {
    operation_status: true,
    temperature: targetSetpoint
  });

  if (!device.status.operation_status) {
    device.status.operation_mode = device.lastMode ?? 'Auto';
  }
  device.status.temperature = targetSetpoint;

  return {
    'event': {
      'header': {
        'namespace': 'Alexa',
        'name': 'Response',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId,
      },
      'payload': {},
    },
    'context': {
      'properties': createThermostatReports(device, 0)
    }
  };
}

/**
 * モード指定
 * https://developer.amazon.com/ja-JP/docs/alexa/device-apis/alexa-thermostatcontroller.html#setthermostatmode-directive
 *
 * @param request
 * @returns
 */
export async function handleSetThermostatMode(request: any) {
  const endpointId = request.directive.endpoint.endpointId as string;
  const deviceId = Number(endpointId);

  const client = getApiClient();
  const device = await client.getDeviceStatus(deviceId);

  const thermostatMode: AlexaThermostatMode = request.directive.payload.thermostatMode.value;
  const customName: string = request.directive.payload.thermostatMode.customName;
  const operationMode = getEoliaOperationMode(thermostatMode, customName);

  if (operationMode) {
    await client.executeCommand(deviceId, {
      operation_mode: operationMode
    });

    device.status.operation_mode = operationMode;
  }

  return {
    'event': {
      'header': {
        'namespace': 'Alexa',
        'name': 'Response',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId,
      },
      'payload': {},
    },
    'context': {
      'properties': createThermostatReports(device, 0)
    }
  };
}

/**
 * Power
 *
 * @param request
 * @param power
 * @returns
 */
export async function handlePower(request: any, power: 'ON' | 'OFF') {
  const endpointId = request.directive.endpoint.endpointId as string;
  const deviceId = Number(endpointId);

  const client = getApiClient();
  const device = await client.getDeviceStatus(deviceId);
  const operationStatus = power === 'ON';

  await client.executeCommand(deviceId, {
    operation_status: operationStatus
  });

  if (operationStatus) {
    device.status.operation_mode = device.lastMode ?? 'Auto';
  } else {
    device.status.operation_mode = 'Stop';
    device.status.temperature = 0;
  }

  return {
    'event': {
      'header': {
        'namespace': 'Alexa',
        'name': 'Response',
        'messageId': uuid(),
        'correlationToken': request.directive.header.correlationToken,
        'payloadVersion': '3'
      },
      'endpoint': {
        'endpointId': endpointId,
      },
      'payload': {},
    },
    'context': {
      'properties': createThermostatReports(device, 0)
    }
  };
}

/**
 * 変更レポートを作成します。
 *
 * @param device
 * @param uncertainty
 * @returns 変更レポート
 */
export function createThermostatReports(device: DeviceStatus, uncertainty: number) {
  const now = DateTime.local().toISO();
  const status = device.status;
  const thermostatMode: AlexaThermostatMode = getAlexaThermostatMode(status.operation_mode);
  // 0度に設定すると、Alexaアプリで操作できなくなる
  const targetSetpoint = EoliaClient.isTemperatureSupport(status.operation_mode) ? status.temperature : 0;

  return [
    // モード指定
    {
      'namespace': 'Alexa.ThermostatController',
      'name': 'thermostatMode',
      'value': thermostatMode,
      'timeOfSample': now,
      'uncertaintyInMilliseconds': uncertainty
    },
    // 温度指定
    {
      'namespace': 'Alexa.ThermostatController',
      'name': 'targetSetpoint',
      'value': {
        'value': targetSetpoint,
        'scale': 'CELSIUS'
      },
      'timeOfSample': now,
      'uncertaintyInMilliseconds': uncertainty
    },
    // 温度計
    {
      'namespace': 'Alexa.TemperatureSensor',
      'name': 'temperature',
      'value': {
        'value': status.inside_temp,
        'scale': 'CELSIUS'
      },
      'timeOfSample': now,
      'uncertaintyInMilliseconds': uncertainty
    },
    // ON/OFF
    {
      'namespace': 'Alexa.PowerController',
      'name': 'powerState',
      'value': status.operation_status ? 'ON' : 'OFF',
      'timeOfSample': now,
      'uncertaintyInMilliseconds': uncertainty
    }
  ];
}
