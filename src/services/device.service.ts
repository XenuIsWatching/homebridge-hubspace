import { HubspacePlatform } from '../platform';
import { Endpoints } from '../api/endpoints';
import { createHttpClientWithBearerInterceptor } from '../api/http-client-factory';
import { AxiosError, AxiosResponse } from 'axios';
import { DeviceStatusResponse } from '../responses/device-status-response';
import { CharacteristicValue } from 'homebridge';
import { convertNumberToHexReverse } from '../utils';
import { isAferoError } from '../responses/afero-error-response';
import { DeviceFunction, getDeviceFunctionDef } from '../models/device-functions';

import AsyncLock from 'async-lock';

/**
 * Service for interacting with devices
 */
export class DeviceService{

    private readonly _httpClient = createHttpClientWithBearerInterceptor({
        baseURL: Endpoints.API_BASE_URL
    });

    private lock = new AsyncLock({timeout: 5000});

    constructor(private readonly _platform: HubspacePlatform){ }

    /**
     * Sets an attribute value for a device
     * @param deviceId ID of a device
     * @param deviceFunction Function to set value for
     * @param value Value to set to attribute
     */
    async setValue(deviceId: string, deviceFunction: DeviceFunction, value: CharacteristicValue): Promise<void>{
        const functionDef = getDeviceFunctionDef(deviceFunction);
        let response: AxiosResponse;

        try{
            await this.lock.acquire('accountServerLock', async () => {
                response = await this._httpClient.post(`accounts/${this._platform.accountService.accountId}/devices/${deviceId}/actions`, {
                    type: 'attribute_write',
                    attrId: functionDef.attributeId,
                    data: this.getDataValue(value)
                });

                //TODO: anyway to get this out of the mutex and keep ts happy?
                if(response.status === 200) return;

                this._platform.log.error(`Remote server did not accept new value ${value} for device (ID: ${deviceId}).`);
            });
        }catch(ex){
            this.handleError(<AxiosError>ex);

            return;
        }
    }

    /**
     * Gets a value for attribute
     * @param deviceId ID of a device
     * @param deviceFunction Function to get value for
     * @returns Data value
     */
    async getValue(deviceId: string, deviceFunction: DeviceFunction): Promise<CharacteristicValue | undefined>{
        const functionDef = getDeviceFunctionDef(deviceFunction);
        let deviceStatus: DeviceStatusResponse;

        try{
            // Acquire the lock, because if multiple threads are accessing the server at the same time, a "The device is not available"
            // error can happen
            return await this.lock.acquire('accountServerLock', async () => {
                const response = await this._httpClient.get<DeviceStatusResponse>(
                    `accounts/${this._platform.accountService.accountId}/devices/${deviceId}?expansions=attributes`);
                deviceStatus = response.data;

                //TODO: anyway to get this out of the mutex and keep ts happy?
                const attributeResponse = deviceStatus.attributes.find(a => a.id === functionDef.attributeId);

                if(!attributeResponse){
                    this._platform.log.error(
                        `Failed to find value for ${functionDef.functionInstanceName} for device (device ID: ${deviceId})`);
                    return undefined;
                }

                return attributeResponse.value;
            });
        }catch(ex){
            this.handleError(<AxiosError>ex);

            return undefined;
        }
    }

    /**
     * Gets a value for attribute as boolean
     * @param deviceId ID of a device
     * @param deviceFunction Function to get value for
     * @returns Boolean value
     */
    async getValueAsBoolean(deviceId: string, deviceFunction: DeviceFunction): Promise<boolean | undefined>{
        const value = await this.getValue(deviceId, deviceFunction);

        if(!value) return undefined;

        return value === '1';
    }

    /**
     * Gets a value for attribute as integer
     * @param deviceId ID of a device
     * @param deviceFunction Function to get value for
     * @returns Integer value
     */
    async getValueAsInteger(deviceId: string, deviceFunction: DeviceFunction): Promise<number | undefined>{
        const value = await this.getValue(deviceId, deviceFunction);

        if(!value || typeof value !== 'string') return undefined;

        const numberValue = Number.parseInt(value);

        return Number.isNaN(numberValue) ? undefined : numberValue;
    }

    private getDataValue(value: CharacteristicValue): string{

        if(typeof value === 'string'){
            return value;
        }

        if(typeof value === 'boolean'){
            return value ? '01' : '00';
        }

        if(typeof value === 'number'){
            return convertNumberToHexReverse(value);
        }

        throw new Error('The value type is not supported.');
    }

    private handleError(error: AxiosError): void{
        const responseData = error.response?.data;
        const errorMessage = isAferoError(responseData) ? responseData.error_description : error.message;

        this._platform.log.error('The remote service returned an error.', errorMessage);
    }

}