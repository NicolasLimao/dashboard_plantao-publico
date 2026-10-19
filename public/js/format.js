export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const AVAILABILITY_LABELS = {
  any: 'Qualquer dia',
  weekend: 'Só fim de semana',
  weekday: 'Só dia de semana',
};

export function formatBr(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function availabilityLabel(value) {
  return AVAILABILITY_LABELS[value] ?? '';
}
