/**
 * Promisified wrapper for navigator.geolocation.getCurrentPosition
 * 
 * @param options PositionOptions
 * @returns Promise<{ lat: string, lng: string }>
 */
export const getCurrentPosition = (options?: PositionOptions): Promise<{ lat: string, lng: string }> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('La geolocalización no está soportada por este navegador.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude.toString(),
                    lng: position.coords.longitude.toString()
                });
            },
            (error) => {
                let msg = 'Error desconocido al obtener ubicación.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = 'Permiso de ubicación denegado. Por favor, habilítalo en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = 'La información de ubicación no está disponible.';
                        break;
                    case error.TIMEOUT:
                        msg = 'Se agotó el tiempo de espera para obtener la ubicación.';
                        break;
                }
                reject(new Error(msg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
                ...options
            }
        );
    });
};

/**
 * Calculate distance between two points in meters
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};
