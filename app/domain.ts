import {schoolCalendar} from './school-calendar';
export const students = [{id:'demo-1001',name:'Leonor',number:'1001'},{id:'demo-1002',name:'Miguel',number:'1002'},{id:'demo-1003',name:'Inês',number:'1003'}];
export type Choice = 'normal'|'vegetarian'|'none';
export type Menu = {date:string;normal:string;vegetarian:string;soup:string;dessert:string};
export function weekDates(offset=0, now=new Date()) {
 const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7 || 7)+offset*7);
 return Array.from({length:5},(_,i)=>{const day=new Date(d);day.setUTCDate(d.getUTCDate()+i);return day.toISOString().slice(0,10);});
}
const isoDate=/^\d{4}-\d{2}-\d{2}$/;
function parseDate(date:string) {
 if(!isoDate.test(date))throw new Error('Data inválida.');
 const d=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw new Error('Data inválida.');
 return d;
}
function previousDate(date:string) {const d=parseDate(date);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
export function isServiceDay(date:string) {
 return schoolCalendar.serviceWeekdays.includes(parseDate(date).getUTCDay())&&!schoolCalendar.noServiceDates.includes(date);
}
function localDeadline(date:string) {
 const target=Date.parse(date+'T00:00:00Z')+schoolCalendar.cutoffHour*3600000+schoolCalendar.cutoffMinute*60000;
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:schoolCalendar.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let guess=target;
 for(let i=0;i<3;i++){
  const parts=Object.fromEntries(formatter.formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const shown=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);
  guess+=target-shown;
 }
 return new Date(guess);
}
export function deadline(date:string) {
 parseDate(date);
 let previous=previousDate(date);
 for(let i=0;i<3660&&!isServiceDay(previous);i++)previous=previousDate(previous);
 if(!isServiceDay(previous))throw new Error('Calendário sem dias de serviço.');
 return localDeadline(previous);
}
export function bookingStatus(date:string,now=new Date()) {
 if(!isServiceDay(date))return {open:false,reason:'Sem serviço de cantina neste dia.',deadline:null};
 const limit=deadline(date);
 return {open:now<limit,reason:now<limit?'Marcações abertas':'Prazo de marcação terminado.',deadline:limit.toISOString()};
}
export const examples=[
 ['Frango assado com arroz','Grão com legumes e arroz','Creme de cenoura','Maçã'],
 ['Pescada no forno com batata','Massa com legumes e feijão','Sopa de legumes','Pera'],
 ['Esparguete à bolonhesa','Esparguete com lentilhas','Creme de abóbora','Laranja'],
 ['Peru estufado com arroz','Caril de grão com arroz','Sopa de espinafres','Banana'],
 ['Bacalhau com batatas','Empadão de legumes','Sopa de feijão','Fruta da época'],
];
export function defaultMenu(date:string,i:number):Menu {const x=examples[i];return {date,normal:x[0],vegetarian:x[1],soup:x[2],dessert:x[3]};}
