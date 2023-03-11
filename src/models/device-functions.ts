import { DeviceFunctionDef } from './device-function-def';

/**
 * Device functions types
 */
export enum DeviceFunction{
    LightPower,
    Brightness,
    FanPower,
    FanSpeed,
    LightTemperature,
    LightColor,
    ColorMode
}

/**
 * Supported/implemented device functions
 * with identifiers for discovery and/or manipulation.
 */
export const DeviceFunctions: DeviceFunctionDef[] = [
    // {
    //     type: DeviceFunction.LightPower,
    //     attributeId: 2,
    //     functionClass: 'power',
    //     functionInstanceName: 'light-power'
    // },
    // {
    //     type: DeviceFunction.Brightness,
    //     attributeId: 4,
    //     functionClass: 'brightness'
    // },
    {
        type: DeviceFunction.FanPower,
        attributeId: 3,
        functionClass: 'power',
        functionInstanceName: 'fan-power'
    },
    {
        type: DeviceFunction.FanSpeed,
        attributeId: 6,
        functionClass: 'fan-speed',
        functionInstanceName: 'fan-speed'
    },
    // TODO: handle fan light and bulb light power
    {
        type: DeviceFunction.LightPower,
        attributeId: 1,
        functionClass: 'power'
    },
    {
        type: DeviceFunction.Brightness,
        attributeId: 2,
        functionClass: 'brightness'
    },
    {
        type: DeviceFunction.LightTemperature,
        attributeId: 3,
        functionClass: 'color-temperature'
    },
    {
        type: DeviceFunction.LightColor,
        attributeId: 4,
        functionClass: 'color-rgb'
    },
    // This is to switch between Temperature (val:0) and Color (val:1) Light Modes, as Homekit sees these as mutually
    // exclusive, the value should always be Color (val:1) when being controlled by Homekit, otherwise 'undefined' will
    // be returned when reading the current color setting
    {
        type: DeviceFunction.ColorMode,
        attributeId: 5,
        functionClass: 'color-mode'
    }
];

/**
 * Gets function definition for a type
 * @param deviceFunction Function type
 * @returns Function definition for type
 * @throws {@link Error} when a type has no definition associated with it
 */
export function getDeviceFunctionDef(deviceFunction: DeviceFunction): DeviceFunctionDef{
    const fc = DeviceFunctions.find(fc => fc.type === deviceFunction);

    // Throw an error when not found - function definition must be set during development,
    // otherwise the plugin will not work as expected.
    if(!fc){
        throw new Error(`Failed to get function definition for '${deviceFunction}'. Each function requires to set a definition.`);
    }

    return fc;
}