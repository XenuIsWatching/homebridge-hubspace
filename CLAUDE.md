# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation to dist/
npm run lint           # ESLint (zero warnings allowed)
npm run watch          # Build + npm link + nodemon (dev mode)
npm run prepublishOnly # lint + build (runs automatically before publish)
```

There is no test suite. ESLint is the primary quality gate.

## Architecture

This is a Homebridge dynamic platform plugin integrating Hubspace smart home devices (sold at Home Depot) into Apple HomeKit. Hubspace devices communicate via the **Afero cloud API** (`semantics2.afero.net`). Authentication uses Keycloak OAuth2 against `accounts.hubspaceconnect.com`.

### Initialization flow

```
index.ts
  └─ platform.ts (HubspacePlatform: DynamicPlatformPlugin)
       ├─ TokenService (singleton) — JWT auth + refresh
       ├─ AccountService — resolves user account ID, triggers discovery
       └─ DiscoveryService — fetches metadevices, creates/caches accessories
            └─ DeviceService — per-device attribute read/write via Afero API
```

### Adding a new device type

1. Add an entry to `src/models/device-type.ts`
2. Create `src/accessories/{type}-accessory.ts` extending `HubspaceAccessory`
3. Register it in `src/accessories/device-accessory-factory.ts`
4. Wire any new capabilities through `DeviceFunction` enum (`src/models/device-function.ts`) and `DeviceService`

### Services

- **TokenService** (`src/services/token.service.ts`) — Singleton. Handles Keycloak password grant and automatic token refresh before expiration.
- **AccountService** (`src/services/account.service.ts`) — Resolves the authenticated user's Afero account ID; fires a callback that triggers device discovery.
- **DiscoveryService** (`src/services/discovery.service.ts`) — Fetches `/accounts/{id}/metadevices`, filters to leaf devices only, maps to `Device` model, manages Homebridge accessory lifecycle (add/update/remove).
- **DeviceService** (`src/services/device.service.ts`) — Reads and writes individual device attributes. Handles data encoding (booleans → `'01'`/`'00'`, numbers → reversed hex bytes). Detects offline devices.

### Accessories

All accessories extend `HubspaceAccessory` (`src/accessories/hubspace-accessory.ts`), which handles HomeKit service setup, characteristic wiring, and device function validation.

Implementations:
- `light-accessory.ts` — power, brightness, RGB color, color temperature, dual color-space mode
- `fan-accessory.ts` — fan power/speed + integrated light
- `outlet-accessory.ts` — on/off outlet
- `sprinkler-accessory.ts` — water timer with max-on-time and battery level

### Config

`config.schema.json` defines the user-facing schema. `src/config.ts` validates required fields (`username`, `password`) at startup. The optional `dualColorSpace` boolean creates a second HomeKit light for color-temperature-only control on RGB lights.

### Utilities

`src/utils.ts` contains color space conversions (RGB ↔ HSV, Kelvin ↔ RGB, RGB → Mireds) and byte-reversal helpers used when encoding attribute values for the Afero API.

## Conventions

- PascalCase for types/enums, camelCase for functions/properties, `_` prefix for private fields
- No `I` prefix on interfaces
- Branch names: `{issue-number}-{issue-description}`
- All API knowledge is from reverse-engineering — there are no official Hubspace/Afero docs
