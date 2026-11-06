const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlRounded = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0
});

/** Formata um valor em reais (R$ 1.234,56). */
export const formatBRL = (value: number): string => brl.format(value);

/** Formata em reais sem centavos (R$ 1.235). */
export const formatBRLRounded = (value: number): string => brlRounded.format(value);
