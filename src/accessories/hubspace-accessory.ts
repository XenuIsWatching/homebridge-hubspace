import { PlatformConfig, Logger, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { Device } from '../models/device';
import { DeviceFunction } from '../models/device-functions';
import { HubspacePlatform } from '../platform';
import { DeviceService } from '../services/device.service';

/**
 * Base class for Hubspace accessories
 */
export abstract class HubspaceAccessory{

    /**
     * Accessory services
     */
    protected readonly services: Service[] = [];

    /**
     * Application logger
     */
    protected readonly log: Logger;

    /**
     * Application config
     */
    protected readonly config: PlatformConfig;

    /**
     * Device interaction service
     */
    protected readonly deviceService: DeviceService;

    /**
     * Device information
     */
    protected readonly device: Device;

    /**
     * Crates new instance of {@link HubspaceAccessory}
     * @param platform Hubspace platform
     * @param accessory Platform accessory
     * @param service Service type for accessory
     */
    constructor(
        protected readonly platform: HubspacePlatform,
        protected readonly accessory: PlatformAccessory,
        services: (Service | WithUUID<typeof Service>)[]
    ) {
        for (const service of services) {
            const svc = service as Service;
            const cls = service as WithUUID<typeof Service>;
            const initializedService =
                (svc.subtype ? accessory.getServiceById(svc.UUID ?? cls.UUID, svc.subtype) : undefined) ||
                accessory.getService(cls) ||
                this.accessory.addService(service as Service);
            this.services.push(initializedService);
        }

        this.config = platform.config;
        this.log = platform.log;
        this.deviceService = platform.deviceService;
        this.device = accessory.context.device;

        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, this.device.manufacturer ?? 'N/A')
            .setCharacteristic(this.platform.Characteristic.Model, this.device.model.length > 0 ? this.device.model[0] : 'N/A')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId ?? 'N/A');

    }

    /**
     * Checks whether function is supported by device
     * @param deviceFunction Function to check
     * @returns True if function is supported by the device otherwise false
     */
    protected supportsFunction(deviceFunction: DeviceFunction): boolean{
        return this.device.functions.some(fc => fc.functionClass === deviceFunction);
    }

    protected removeStaleServices(): void{
        /* slice out the accessory service */
        const staleServices =
            this.accessory.services.slice(1).filter(a => !this.services.some(d => d.UUID === a.UUID && a.displayName === d.displayName));
        for (const staleService of staleServices) {
            this.accessory.removeService(staleService);
        }
    }

    protected configureName(service: Service, name: string): void{
        service.setCharacteristic(this.platform.Characteristic.Name, name);
        service.setCharacteristic(this.platform.Characteristic.ConfiguredName, name);
    }
}