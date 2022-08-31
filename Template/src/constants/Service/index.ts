import axios, { AxiosRequestConfig } from 'axios';

 
export const API_URL = process.env.REACT_APP_API;
export const publicAPIService = axios.create({ baseURL: API_URL });
export const apiService = axios.create({ baseURL: API_URL });

const localStorageToken = process.env.REACT_APP_LOCAL_STORAGE_TOKEN;
const localStorageProfile = process.env.REACT_APP_LOCAL_STORAGE_PROFILE;
const localStorageRefreshToken = process.env.REACT_APP_LOCAL_STORAGE_REFRESH_TOKEN;
export class TokenStorage {
    private static readonly LOCAL_STORAGE_TOKEN = localStorageToken || "";

    private static readonly LOCAL_STORAGE_PROFILE = localStorageProfile || "";

    private static readonly LOCAL_STORAGE_REFRESH_TOKEN = localStorageRefreshToken || "";

    public static isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    public static getAuthentication(): AxiosRequestConfig {
        return {
            headers: { Authorization: `Token ${this.getToken()}` },
        };
    }

    public static getNewToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            apiService
                .post(`auth/jwt/refresh/`, {
                    refresh: this.getRefreshToken(),
                })
                .then((response:any) => {
                    this.storeToken(response.data.access);
                    this.storeRefreshToken(
                        response.data.refresh,
                    );
                    resolve(response.data.access);
                })
                .catch((error:any) => {
                    reject(error);
                });
        });
    }

    public static storeToken(token: string): void {
        localStorage.setItem(TokenStorage.LOCAL_STORAGE_TOKEN, token);
    }

    public static storeProfileData(profile: any): void {
        localStorage.setItem(TokenStorage.LOCAL_STORAGE_PROFILE, JSON.stringify(profile));
    }

    public static storeRefreshToken(refreshToken: string): void {
        localStorage.setItem(
            TokenStorage.LOCAL_STORAGE_REFRESH_TOKEN,
            refreshToken,
        );
    }

    public static clear(): void {
        localStorage.removeItem(TokenStorage.LOCAL_STORAGE_TOKEN);
        localStorage.removeItem(
            TokenStorage.LOCAL_STORAGE_REFRESH_TOKEN,
        );
        localStorage.removeItem(TokenStorage.LOCAL_STORAGE_PROFILE);
    }

    public static getRefreshToken(): string | null {
        return localStorage.getItem(
            TokenStorage.LOCAL_STORAGE_REFRESH_TOKEN,
        );
    }

    public static getToken(): string | null {
        return localStorage.getItem(TokenStorage.LOCAL_STORAGE_TOKEN);
    }

    public static getProfile(): any {
        let profile: any = localStorage.getItem(TokenStorage.LOCAL_STORAGE_PROFILE);
        if (profile) {
            profile = JSON.parse(profile);
        }
        return profile;
    }

}
 
export const responseInterceptor = apiService.interceptors.response.use(
    (response:any) => {
        // Return a successful response back to the calling service
        return response;
    },
    (error:any) => {
        // Return any error which is not due to authentication back to the calling service
        if (
            (error.response && error.response.status !== 401) ||
            error.config.url === 'auth/jwt/create/'
        ) {
            return new Promise((resolve, reject) => reject(error));
        }
        // Logout user if token refresh didn't work or user is disabled
        if (
            error.config.url === 'auth/jwt/refresh/'
        ) {
            TokenStorage.clear();
            window.location.href="/";
            // return new Promise((resolve, reject) => reject(error));
            return null;
        }
        // Try request again with new token
        return TokenStorage.getNewToken()
            .then(token => {
                // New request with new token
                const { config } = error;
                config.headers.Authorization = `Token ${token}`;

                return new Promise((resolve, reject) => {
                    apiService
                        .request(config)
                        .then((response:any) => {
                            resolve(response);
                        })
                        .catch((re_request_error: any) => {
                            reject(re_request_error);
                        });
                });
            })
            .catch(new_token_error => {
                return new Promise((resolve, reject) =>
                    reject(new_token_error),
                );
            });
    },
);