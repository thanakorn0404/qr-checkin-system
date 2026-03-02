// app/ui.ts
export function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

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
  `,
    h1: `text-2xl font-semibold
    `,
    sub: `text-white/60 text-sm
    `,
    btn: `inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-60
    `,
    btnGhost: `border border-white/10 bg-white/5 hover:bg-white/10
    `,
    border: `border border-white/10
    `,
    shadow: `shadow-lg shadow-black/30
    `,
    h2: `text-lg font-semibold
    `,
};

