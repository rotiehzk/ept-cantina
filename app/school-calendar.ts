/** Configuração provisória. A escola deve validar estes valores antes do uso real. */
export const schoolCalendar = {
 timeZone: 'Europe/Lisbon',
 cutoffHour: 18,
 cutoffMinute: 0,
 // Datas ISO sem serviço (feriados, férias, encerramentos e interrupções letivas).
 // A lista começa vazia de propósito: não presumir o calendário oficial.
 noServiceDates: [] as string[],
 // Por omissão, a cantina serve refeições de segunda a sexta-feira.
 serviceWeekdays: [1,2,3,4,5] as number[],
};
