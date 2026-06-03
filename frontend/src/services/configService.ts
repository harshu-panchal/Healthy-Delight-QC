import api from './api/config';

export interface AppConfig {
    deliveryFee: number;
    freeDeliveryThreshold: number;
    platformFee: number;
    taxes: {
        gst: number;
    };
    estimatedDeliveryTime: string;
}

// Default configuration (fallback)
const defaultConfig: AppConfig = {
    deliveryFee: 40,
    freeDeliveryThreshold: 199,
    platformFee: 2,
    taxes: {
        gst: 18
    },
    estimatedDeliveryTime: '12-15 mins'
};

// Synchronous helper for immediate UI needs (until async context is fully adopted)
export const appConfig = { ...defaultConfig };

/**
 * Get application configuration from backend settings
 */
export const getAppConfig = async (): Promise<AppConfig> => {
    try {
        const response = await api.get('/settings/public');
        if (response.data && response.data.success && response.data.data) {
            const data = response.data.data;
            const fetchedConfig = {
                deliveryFee: typeof data.deliveryCharges === 'number' ? data.deliveryCharges : defaultConfig.deliveryFee,
                freeDeliveryThreshold: typeof data.freeDeliveryThreshold === 'number' ? data.freeDeliveryThreshold : defaultConfig.freeDeliveryThreshold,
                platformFee: typeof data.platformFee === 'number' ? data.platformFee : defaultConfig.platformFee,
                taxes: {
                    gst: typeof data.gstRate === 'number' ? data.gstRate : defaultConfig.taxes.gst
                },
                estimatedDeliveryTime: defaultConfig.estimatedDeliveryTime
            };
            Object.assign(appConfig, fetchedConfig);
        }
    } catch (e) {
        console.error("Failed to fetch dynamic settings fallbacks:", e);
    }
    return appConfig;
};
