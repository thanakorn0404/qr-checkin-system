// app/ui.ts

export const theme = {
  page: `
    min-h-screen 
    bg-gradient-to-br from-white via-blue-50 to-sky-100
    text-slate-800
    selection:bg-sky-300 selection:text-white
  `,

  card: `
    bg-white 
    border border-sky-100
    rounded-2xl 
    shadow-lg shadow-sky-100/50
    p-6
  `,

  buttonPrimary: `
    bg-gradient-to-r from-sky-500 to-blue-500
    hover:from-sky-600 hover:to-blue-600
    text-white
    px-4 py-2
    rounded-xl
    font-medium
    transition-all duration-200
    shadow-md hover:shadow-lg
    active:scale-95
  `,

  input: `
    w-full
    border border-sky-200
    focus:border-sky-400
    focus:ring-2 focus:ring-sky-200
    rounded-xl
    px-4 py-2
    outline-none
    transition
    bg-white
  `
};