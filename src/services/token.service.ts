import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { TokenResponse } from '../responses/token-response';
import { Endpoints } from '../api/endpoints';

interface PersistedToken {
    refreshToken: string;
    refreshTokenExpiration: string;
}

/**
 * Service for managing JWT tokens
 */
export class TokenService{
    private static _instance: TokenService;

    private readonly _httpClient = axios.create({
        baseURL: Endpoints.ACCOUNT_BASE_URL
    });

    private _accessToken?: string;
    private _accessTokenExpiration?: Date;
    private _refreshToken?: string;
    private _refreshTokenExpiration?: Date;
    private readonly _tokenFilePath: string;

    /**
     * Creates a new instance of token service
     * @param _username Account username
     * @param _password Account password
     * @param storagePath Homebridge storage path for persisting refresh token
     */
    private constructor(
        private readonly _username: string,
        private readonly _password: string,
        storagePath: string) {
        this._tokenFilePath = path.join(storagePath, '.hubspace-token.json');
        this.loadPersistedToken();
    }


    /**
     * {@link TokenService} instance
     */
    public static get instance(): TokenService{
        return TokenService._instance;
    }

    /**
     * Initializes {@link TokenService}
     * @param _username Account username
     * @param _password Account password
     * @param storagePath Homebridge storage path for persisting refresh token
     */
    public static init(username: string, password: string, storagePath: string): void{
        TokenService._instance = new TokenService(username, password, storagePath);
    }

    public async getToken(): Promise<string | undefined>{
        if(!this.hasValidToken()){
            await this.authenticate();
        }

        return this._accessToken;
    }

    public hasValidToken(): boolean{
        return this._accessToken !== undefined && !this.isAccessTokenExpired();
    }

    private async authenticate(): Promise<boolean>{
        // If nothing is expired then no need to run authentication again
        if(!this.isAccessTokenExpired() && !this.isRefreshTokenExpired()) return true;

        const tokenResponse = await this.getTokenFromRefreshToken() || await this.getTokenFromCredentials();

        this.setTokens(tokenResponse);

        if(!tokenResponse) return false;

        return true;
    }

    private async getTokenFromRefreshToken(): Promise<TokenResponse | undefined>{
        // If refresh token is expired then don't even try...
        if(this.isRefreshTokenExpired()) return undefined;

        const params = new URLSearchParams();

        params.append('grant_type', 'refresh_token');
        params.append('client_id', 'hubspace_android');
        params.append('refresh_token', this._refreshToken!);

        try{
            const response = await this._httpClient.post('/protocol/openid-connect/token', params);

            return response.status === 200 ? response.data : undefined;
        }catch(exception){
            return undefined;
        }
    }

    private async getTokenFromCredentials(): Promise<TokenResponse | undefined>{
        const params = new URLSearchParams();

        params.append('grant_type', 'password');
        params.append('client_id', 'hubspace_android');
        params.append('username', this._username);
        params.append('password', this._password);

        try{
            const response = await this._httpClient.post('/protocol/openid-connect/token', params);

            return response.status === 200 ? response.data : undefined;
        }catch(exception){
            return undefined;
        }
    }


    /**
     * Sets tokens to new values
     * @param response Response with tokens
     */
    private setTokens(response?: TokenResponse): void{
        if(!response){
            this.clearTokens();
            return;
        }

        this._accessToken = response.access_token;
        this._refreshToken = response.refresh_token;

        const currentDate = new Date();

        this._accessTokenExpiration = new Date(currentDate.getTime() + response.expires_in * 1000);
        this._refreshTokenExpiration = new Date(currentDate.getTime() + response.refresh_expires_in * 1000);

        this.persistToken();
    }

    /**
     * Clears stored tokens
     */
    private clearTokens(): void{
        this._accessToken = undefined;
        this._refreshToken = undefined;
        this._accessTokenExpiration = undefined;
        this._refreshTokenExpiration = undefined;
    }

    private persistToken(): void{
        if(!this._refreshToken || !this._refreshTokenExpiration) return;
        try{
            const data: PersistedToken = {
                refreshToken: this._refreshToken,
                refreshTokenExpiration: this._refreshTokenExpiration.toISOString(),
            };
            fs.writeFileSync(this._tokenFilePath, JSON.stringify(data), 'utf8');
        }catch(_){ /* non-fatal */ }
    }

    private loadPersistedToken(): void{
        try{
            const raw = fs.readFileSync(this._tokenFilePath, 'utf8');
            const data: PersistedToken = JSON.parse(raw);
            const expiration = new Date(data.refreshTokenExpiration);
            if(expiration > new Date()){
                this._refreshToken = data.refreshToken;
                this._refreshTokenExpiration = expiration;
            }
        }catch(_){ /* no persisted token, will authenticate with credentials */ }
    }

    /**
     * Checks whether the access token is expired
     * @returns True if access token is expired otherwise false
     */
    private isAccessTokenExpired(): boolean{
        return !this._accessTokenExpiration || this._accessTokenExpiration < new Date();
    }

    /**
     * Checks whether the refresh token is expired
     * @returns True if refresh token is expired otherwise false
     */
    private isRefreshTokenExpired(): boolean{
        return !this._refreshTokenExpiration || this._refreshTokenExpiration < new Date();
    }

}