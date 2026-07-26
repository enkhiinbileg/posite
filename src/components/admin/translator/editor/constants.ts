export const FONTS = [
    { name: 'Mogul Irina', value: '"Mogul Irina", sans-serif' },
    // Segoe UI Family
    { name: 'Segoe UI', value: '"Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Italic', value: '"Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Bold', value: '"Segoe UI", sans-serif', weight: 'bold', family: 'Segoe UI' },
    { name: 'Segoe UI Bold Italic', value: '"Segoe UI", sans-serif', weight: 'bold', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Light', value: '"Segoe UI Light", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Light Italic', value: '"Segoe UI Light", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Semilight', value: '"Segoe UI Semilight", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Semilight Italic', value: '"Segoe UI Semilight", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Semibold', value: '"Segoe UI Semibold", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Semibold Italic', value: '"Segoe UI Semibold", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },
    { name: 'Segoe UI Black', value: '"Segoe UI Black", "Segoe UI", sans-serif', family: 'Segoe UI' },
    { name: 'Segoe UI Black Italic', value: '"Segoe UI Black", "Segoe UI", sans-serif', style: 'italic', family: 'Segoe UI' },

    // Segoe Print Family
    { name: 'Segoe Print', value: '"Segoe Print", sans-serif', family: 'Segoe Print' },
    { name: 'Segoe Print Bold', value: '"Segoe Print", sans-serif', weight: 'bold', family: 'Segoe Print' },

    // Other System Fonts
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Arial Black', value: '"Arial Black", Arial, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },

    // Google Fonts
    { name: 'Pangolin', value: 'var(--font-pangolin), sans-serif' },
    { name: 'Neucha', value: 'var(--font-neucha), cursive' },
    { name: 'Rubik', value: 'var(--font-rubik), sans-serif' },
    { name: 'Oswald', value: 'var(--font-oswald), sans-serif' },
    { name: 'Bangers', value: 'var(--font-bangers), cursive' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto Condensed', value: 'var(--font-roboto-condensed), sans-serif' },
    { name: 'Montserrat', value: 'var(--font-montserrat), sans-serif' },
    { name: 'Playfair Display', value: 'var(--font-playfair), serif' },
    { name: 'Lora', value: 'var(--font-lora), serif' },
    { name: 'Nunito', value: 'var(--font-nunito), sans-serif' },
    { name: 'Ubuntu', value: 'var(--font-ubuntu), sans-serif' },
    { name: 'Caveat', value: 'var(--font-caveat), cursive' },
    { name: 'Lobster', value: 'var(--font-lobster), cursive' },
    { name: 'Amatic SC', value: 'var(--font-amatic), cursive' },
    { name: 'Russo One', value: 'var(--font-russo), sans-serif' },
    { name: 'Press Start 2P', value: 'var(--font-press-start), cursive' },
    { name: 'Comfortaa', value: 'var(--font-comfortaa), sans-serif' },
    { name: 'Exo 2', value: 'var(--font-exo2), sans-serif' },
    { name: 'Marck Script', value: 'var(--font-marck), cursive' },
    { name: 'Bad Script', value: 'var(--font-bad-script), cursive' },
    { name: 'Fira Sans', value: 'var(--font-fira), sans-serif' },
    { name: 'Balsamiq Sans', value: 'var(--font-balsamiq), sans-serif' },
    { name: 'Metal Mania', value: 'var(--font-metal-mania), cursive' },
    { name: 'Creepster', value: 'var(--font-creepster), cursive' },
    { name: 'Luckiest Guy', value: 'var(--font-luckiest-guy), cursive' },
    { name: 'Komika', value: 'system-ui, sans-serif' } // Fallback
];

export const STYLE_PRESETS = [
    {
        id: 'ignition',
        name: 'Ignition',
        style: {
            fontFamily: 'var(--font-metal-mania), cursive',
            color: '#ffdd00',
            color2: '#ff0000',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#ffffff',
            strokeWidth: 4,
            glowColor: '#ff0000',
            glowBlur: 15,
            glowOpacity: 0.8,
            shadowColor: '#000000',
            shadowBlur: 10,
            shadowOffsetX: 4,
            shadowOffsetY: 4,
            shadowOpacity: 0.5,
            fontWeight: '900'
        },
        previewIcon: '🔥'
    },
    {
        id: 'horror',
        name: 'Horror',
        style: {
            fontFamily: 'var(--font-creepster), cursive',
            color: '#ff0000',
            color2: '#4a0000',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#000000',
            strokeWidth: 2,
            glowColor: '#ff0000',
            glowBlur: 10,
            glowOpacity: 0.4,
            shadowColor: '#000000',
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 1,
            fontWeight: 'normal'
        },
        previewIcon: '🧟'
    },
    {
        id: 'action',
        name: 'Action',
        style: {
            fontFamily: 'var(--font-luckiest-guy), cursive',
            color: '#ffffff',
            color2: '#0099ff',
            gradientEnabled: true,
            gradientAngle: 180,
            strokeColor: '#000000',
            strokeWidth: 8,
            shadowColor: '#000000',
            shadowBlur: 0,
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            shadowOpacity: 1,
            fontWeight: 'normal'
        },
        previewIcon: '💥'
    },
    {
        id: 'gold',
        name: 'Royal Gold',
        style: {
            fontFamily: 'var(--font-playfair), serif',
            color: '#fff5bd',
            color2: '#b38b00',
            gradientEnabled: true,
            gradientAngle: 135,
            strokeColor: '#5c4b00',
            strokeWidth: 1,
            shadowColor: '#000000',
            shadowBlur: 10,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowOpacity: 0.3,
            fontWeight: '900'
        },
        previewIcon: '👑'
    },
    {
        id: 'neon',
        name: 'Neon Pink',
        style: {
            fontFamily: 'var(--font-russo), sans-serif',
            color: '#ffffff',
            strokeColor: '#ff00ff',
            strokeWidth: 1,
            glowColor: '#ff00ff',
            glowBlur: 20,
            glowOpacity: 0.9,
            shadowColor: '#ff00ff',
            shadowBlur: 40,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0.5,
            fontWeight: 'normal'
        },
        previewIcon: '💖'
    }
];
