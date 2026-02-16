'use client';

import { useEffect } from 'react';

export default function SecurityGuard() {
    useEffect(() => {
        // Only run in production to not annoy developers during development
        if (process.env.NODE_ENV !== 'production') return;

        const disableContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const disableKeyCommands = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return;
            }

            // Ctrl + Shift + I/J/C
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
                return;
            }

            // Ctrl + U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return;
            }
        };

        // Anti-debugging trick
        // This creates a loop that triggers deep debugger breaks
        const antiDebug = () => {
            const start = new Date().getTime();
            // eslint-disable-next-line no-debugger
            debugger;
            const end = new Date().getTime();
            if (end - start > 100) {
                // Devtools detected or slow execution
                // We don't do anything drastic but the debugger keyword 
                // will pause the app if devtools are open
            }
        };

        const interval = setInterval(antiDebug, 2000);

        document.addEventListener('contextmenu', disableContextMenu);
        document.addEventListener('keydown', disableKeyCommands);

        return () => {
            clearInterval(interval);
            document.removeEventListener('contextmenu', disableContextMenu);
            document.removeEventListener('keydown', disableKeyCommands);
        };
    }, []);

    return null;
}
