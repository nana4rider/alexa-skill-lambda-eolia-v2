import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EoliaDevice, EoliaOperationMode, EoliaStatus } from 'panasonic-eolia-ts';

class ApiClient {

  private client: AxiosInstance;

  constructor(baseURL: string, apiKey: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept-Language': 'ja-jp',
        'Accept-Encoding': 'gzip',
        'Authorization': 'Api-Key ' + apiKey
      },
    });
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const response: AxiosResponse<DeviceInfo[]> = await this.client.get('/devices');
    return response.data;
  }

  async getDeviceStatus(id: number): Promise<DeviceStatus> {
    const response: AxiosResponse<DeviceStatus> = await this.client.get(`/devices/${id}`);
    return response.data;
  }

  async executeCommand(id: number, command: string, params: any): Promise<void> {
    await this.client.post(`/devices/${id}/command/${command}`, params);
  }
}

interface DeviceInfo {
  id: number;
  deviceName: string;
  info: EoliaDevice;
}

interface DeviceStatus {
  id: number;
  deviceName: string;
  status: EoliaStatus;
  lastMode: EoliaOperationMode | null;
}

export { ApiClient, DeviceInfo, DeviceStatus };
