export const students = [{id:'demo-1001',name:'Leonor',number:'1001'},{id:'demo-1002',name:'Miguel',number:'1002'},{id:'demo-1003',name:'Inês',number:'1003'}];
export type Choice = 'normal'|'vegetarian'|'none';
export type Menu = {date:string;normal:string;vegetarian:string;soup:string;dessert:string};
export function weekDates(offset=0, now=new Date()) {
 const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7 || 7)+offset*7);
 return Array.from({length:5},(_,i)=>{const day=new Date(d);day.setUTCDate(d.getUTCDate()+i);return day.toISOString().slice(0,10);});
}
export function deadline(date:string) {
 const d=new Date(date+'T18:00:00Z');
 do {d.setUTCDate(d.getUTCDate()-1);} while ([0,6].includes(d.getUTCDay()));
 return d;
}
export const examples=[
 ['Frango assado com arroz','Grão com legumes e arroz','Creme de cenoura','Maçã'],
 ['Pescada no forno com batata','Massa com legumes e feijão','Sopa de legumes','Pera'],
 ['Esparguete à bolonhesa','Esparguete com lentilhas','Creme de abóbora','Laranja'],
 ['Peru estufado com arroz','Caril de grão com arroz','Sopa de espinafres','Banana'],
 ['Bacalhau com batatas','Empadão de legumes','Sopa de feijão','Fruta da época'],
];
export function defaultMenu(date:string,i:number):Menu {const x=examples[i];return {date,normal:x[0],vegetarian:x[1],soup:x[2],dessert:x[3]};}
