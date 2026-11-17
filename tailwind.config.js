/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}','./src/components/**/*.{js,ts,jsx,tsx,mdx}','./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {
    colors: {
      // Dream Tales V2 tokens. Values measured from the approved Final Vision (Figma 50:14),
      // which takes precedence over conflicting handoff/DS values — see docs/DESIGN_TOKENS.md.
      dt: {
        violet:'#7364F6', 'violet-light':'#9A79F8', ink:'#252447', muted:'#6E6C8F',
        canvas:'#F7F6FD', lavender:'#EDE7FD', periwinkle:'#DEE3FD', 'tile-violet':'#EDDEFD',
        night:'#1D2345', 'night-deep':'#0C1027', 'night-raised':'#202649', 'night-control':'#323373',
        gold:'#FCE5B8', 'moon-gold':'#FFE1A3', cream:'#FFF8EC', peach:'#F7BFAF',
        success:'#43AF83', warning:'#FFBF64', error:'#EF7078', info:'#56A4FA', brand:'#16164A'
      },
      indigo: {50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4B0082',800:'#3730a3',900:'#312e81'},yellow:{50:'#fefce8',100:'#fef9c3',200:'#fef08a',300:'#fde047',400:'#FFD700',500:'#eab308',600:'#ca8a04',700:'#a16207',800:'#854d0e',900:'#713f12'}},
    fontFamily:{sans:['var(--font-nunito)','ui-rounded','system-ui','sans-serif'],serif:['ui-serif','Georgia'],mono:['ui-monospace','SFMono-Regular']},
    backgroundImage:{'dt-primary':'linear-gradient(90deg,#9A79F8 0%,#7364F6 100%)','dt-night':'linear-gradient(180deg,#1D2345 0%,#0C1027 100%)'},
    borderRadius:{'dt-sm':'12px','dt':'16px','dt-card':'20px','dt-lg':'24px'},
    boxShadow:{'dt-card':'0 8px 24px rgba(37,36,71,.08)',custom:'0 4px 6px -1px rgba(0, 0, 0, .1)','custom-lg':'0 10px 15px -3px rgba(0, 0, 0, .1)'},
    animation:{'fade-in':'fadeIn .5s ease-in-out','slide-in':'slideIn .5s ease-in-out'},
    keyframes:{fadeIn:{'0%':{opacity:'0'},'100%':{opacity:'1'}},slideIn:{'0%':{transform:'translateY(20px)',opacity:'0'},'100%':{transform:'translateY(0)',opacity:'1'}}}
  }},
  plugins:[require('@tailwindcss/forms'),require('@tailwindcss/typography')]
};
