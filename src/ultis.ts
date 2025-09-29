    // utils internos
    export const normalize = (s: any) =>
        (s === null || s === undefined ? '' : String(s).trim().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, ''));

    export const numEqual = (a: any, b: any) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return na === nb;
        // comparar redondeando a 2 decimales (evita problemas de floats)
        return Math.round(na * 100) === Math.round(nb * 100);
    };