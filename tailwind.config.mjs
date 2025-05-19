/** tailwind.config.mjs */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}", // your app folder
        "./app/components/**/*.{js,ts,jsx,tsx}", // explicitly include components
        "./app/routes/**/*.{ts,tsx}" // include your routes
    ],
    theme: {
        extend: {
            colors: {
                blue: {
                    1000: "#0A1D2D",
                    1050: "#030711"
                },
                zinc: {
                    750: "#333338"
                }
            }
        }
    },
    plugins: []
};
