import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { DeviceFunction, getDeviceFunctionDef } from '../models/device-functions';
import { HubspacePlatform } from '../platform';
import { isNullOrUndefined } from '../utils';
import { HubspaceAccessory } from './hubspace-accessory';

export class GlassDoorAccessory extends HubspaceAccessory{

    /**
     * Creates a new instance of the accessory
     * @param platform Hubspace platform
     * @param accessory Platform accessory
     */
    constructor(platform: HubspacePlatform, accessory: PlatformAccessory) {
        const hasBattery = (accessory.context.device?.functions ?? []).some(
            (f: {functionClass: string}) => f.functionClass === DeviceFunction.BatteryLevel
        );
        super(platform, accessory, hasBattery
            ? [platform.Service.Switch, platform.Service.Battery]
            : [platform.Service.Switch]);

        this.configureGlass();

        this.removeStaleServices();
    }

    private configureGlass(): void{
        this.configureName(this.services[0], this.accessory.displayName);

        if(this.supportsFunction(DeviceFunction.Power)){
            this.services[0].getCharacteristic(this.platform.Characteristic.On)
                .onGet(this.getOn.bind(this))
                .onSet(this.setOn.bind(this));
        }

        if(this.supportsFunction(DeviceFunction.BatteryLevel)){
            this.services[1].getCharacteristic(this.platform.Characteristic.StatusLowBattery)
                .onGet(this.getStatusLowBattery.bind(this));
            this.services[1].getCharacteristic(this.platform.Characteristic.BatteryLevel)
                .onGet(this.getBatteryLevel.bind(this));
        }
    }

    private async getOn(): Promise<CharacteristicValue>{
        const func = getDeviceFunctionDef(this.device.functions, DeviceFunction.Power);
        const value = await this.deviceService.getValueAsBoolean(this.device.deviceId, func.values[0].deviceValues[0].key);

        if(isNullOrUndefined(value)){
            throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }

        this.log.debug(`${this.device.name}: Triggered GET On: ${value}`);
        return value!;
    }

    private async setOn(value: CharacteristicValue): Promise<void>{
        const func = getDeviceFunctionDef(this.device.functions, DeviceFunction.Power);
        this.log.debug(`${this.device.name}: Triggered SET On: ${value}`);
        await this.deviceService.setValue(this.device.deviceId, func.values[0].deviceValues[0].key, value);
    }

    private async getStatusLowBattery(): Promise<CharacteristicValue>{
        const func = getDeviceFunctionDef(this.device.functions, DeviceFunction.BatteryLevel);
        const value = await this.deviceService.getValueAsInteger(this.device.deviceId, func.values[0].deviceValues[0].key);

        if(isNullOrUndefined(value)){
            throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }

        let ret;
        if((value as number) <= 20){
            ret = this.platform.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
        } else {
            ret = this.platform.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        }

        this.log.debug(`${this.device.name}: Triggered GET StatusLowBattery: ${ret}`);
        return ret!;
    }

    private async getBatteryLevel(): Promise<CharacteristicValue>{
        const func = getDeviceFunctionDef(this.device.functions, DeviceFunction.BatteryLevel);
        const value = await this.deviceService.getValueAsInteger(this.device.deviceId, func.values[0].deviceValues[0].key);

        if(isNullOrUndefined(value)){
            throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }

        this.log.debug(`${this.device.name}: Triggered GET BatteryLevel: ${value}`);
        return value!;
    }

}
