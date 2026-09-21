export const PASSWORD_RULES = [
  { key: 'length', label: 'Mínimo 10 caracteres', test: (value) => value.length >= 10 },
  { key: 'upper', label: 'Una letra mayúscula', test: (value) => /[A-ZÁÉÍÓÚÑ]/.test(value) },
  { key: 'lower', label: 'Una letra minúscula', test: (value) => /[a-záéíóúñ]/.test(value) },
  { key: 'number', label: 'Un número', test: (value) => /\d/.test(value) },
  { key: 'special', label: 'Un carácter especial', test: (value) => /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s]/.test(value) },
  { key: 'spaces', label: 'Sin espacios', test: (value) => !/\s/.test(value) }
];

export function validarPassword(value = '') {
  const checks = PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(value) }));
  const score = checks.filter((item) => item.ok).length;
  return {
    valid: checks.every((item) => item.ok),
    score,
    checks,
    label: score <= 2 ? 'Débil' : score <= 4 ? 'Media' : score === 5 ? 'Fuerte' : 'Muy fuerte'
  };
}
