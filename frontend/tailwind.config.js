/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyan: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    950: '#083344',
                },
                emerald: {
                    400: '#34d399',
                },
                slate: {
                    400: '#94a3b8',
                    500: '#64748b',
                    800: '#1e293b',
                    900: '#0f172a',
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
            }
        },
    },
    plugins: [],
}
