/**
 * Haptic Feedback Utilities
 * 
 * Proporciona feedback táctil (vibración) para mejorar la experiencia móvil.
 * Compatible con la mayoría de navegadores móviles modernos.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10], // Doble vibración ligera
    warning: [20, 100, 20], // Doble vibración media
    error: [30, 100, 30, 100, 30], // Triple vibración fuerte
};

/**
 * Ejecuta feedback táctil si está disponible en el dispositivo
 * 
 * @param type Tipo de feedback: 'light', 'medium', 'heavy', 'success', 'warning', 'error'
 * @example
 * // En un botón de acción
 * onClick={() => {
 *   hapticFeedback('medium');
 *   handleAction();
 * }}
 */
export const hapticFeedback = (type: HapticType = 'light'): void => {
    // Verificar si el navegador soporta vibración
    if ('vibrate' in navigator) {
        try {
            const pattern = hapticPatterns[type];
            navigator.vibrate(pattern);
        } catch (error) {
            // Silenciar errores - no todos los navegadores lo soportan completamente
            console.debug('Haptic feedback not supported:', error);
        }
    }
};

/**
 * Verifica si el dispositivo soporta haptic feedback
 */
export const isHapticSupported = (): boolean => {
    return 'vibrate' in navigator;
};

/**
 * Helper para añadir haptic feedback a handlers de click
 * 
 * @example
 * const handleClick = withHaptic(() => {
 *   // Tu lógica aquí
 * }, 'medium');
 */
export const withHaptic = <T extends (...args: any[]) => any>(
    handler: T,
    type: HapticType = 'light'
): ((...args: Parameters<T>) => ReturnType<T>) => {
    return (...args: Parameters<T>): ReturnType<T> => {
        hapticFeedback(type);
        return handler(...args);
    };
};
