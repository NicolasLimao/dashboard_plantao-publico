// Valores fictícios de demonstração, editáveis na interface. Não representam política de nenhuma empresa.
// Valores em CENTAVOS (inteiros). Soma de dinheiro em ponto flutuante acumula
// erro de arredondamento; a conversão para reais acontece só na exibição.
export const DEFAULT_RATES = {
  weekday: 2500,   // Seg–Qui, 22:01→07:59
  friday: 5000,   // Sex 22:01→Sáb 18:00
  saturday: 7500,  // Sáb 18:01→Dom 18:00
  sunday: 10000,   // Dom 18:01→Seg 07:59
  holiday: 12500,   // feriado, 24h de atuação
};

export const RATE_KEYS = ['weekday', 'friday', 'saturday', 'sunday', 'holiday'];

// Dinheiro em centavos: só inteiro não-negativo. Devolve as chaves inválidas.
export function invalidRateKeys(rates) {
  return RATE_KEYS.filter((key) => {
    const value = rates?.[key];
    return !Number.isInteger(value) || value < 0;
  });
}

export const RATE_LABELS = {
  weekday: 'Segunda a Quinta',
  friday: 'Sexta → Sábado',
  saturday: 'Sábado → Domingo',
  sunday: 'Domingo → Segunda',
  holiday: 'Feriado',
};

// O turno é identificado pelo dia em que COMEÇA; feriado tem precedência
// sobre o dia da semana.
export function kindForDay({ weekday, holiday = false }) {
  if (holiday) return 'holiday';
  if (weekday === 5) return 'friday';
  if (weekday === 6) return 'saturday';
  if (weekday === 0) return 'sunday';
  return 'weekday';
}
