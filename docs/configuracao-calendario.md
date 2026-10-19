# Configuração provisória da cantina

A tarefa #5 utiliza `app/school-calendar.ts` como fonte única de configuração.

- `cutoffHour: 18` e `cutoffMinute: 0`: limite às 18h00 **locais**, sujeito a confirmação pela escola.
- `timeZone: 'Europe/Lisbon'`: horário de Portugal continental, com mudança automática entre UTC e UTC+1.
- `serviceWeekdays: [1,2,3,4,5]`: segunda a sexta-feira.
- `noServiceDates`: acrescentar datas ISO `AAAA-MM-DD` para feriados, férias, interrupções letivas e encerramentos **confirmados pela escola**.

Exemplo: `noServiceDates: ['2026-12-25']`. Não foi pré-carregado um calendário oficial.

O prazo de um almoço é calculado às 18h do último dia anterior com serviço; se não houver serviço na data pretendida, a marcação é recusada. O servidor volta a validar todos os pedidos, independentemente do estado apresentado no navegador. A interface atualiza-se a cada segundo para refletir a passagem do prazo.

**Antes do uso real:** confirmar horários, calendário e responsável pela manutenção; executar os testes e verificar a mudança de hora, a ausência de serviço e a utilização em dispositivos reais. Esta versão configura as regras através de um ficheiro versionado, não de um painel administrativo; alterações requerem publicação de nova versão.
