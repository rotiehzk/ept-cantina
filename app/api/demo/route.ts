import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { students, weekDates, deadline, defaultMenu } from '../../domain';
export const dynamic='force-dynamic';
function response(data:unknown,status=200) {return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function context(){const user=await getChatGPTUser();if(!user)return null;if(!env.DB)throw new Error('D1 unavailable');return {db:env.DB,key:user.userId};}
export async function GET(req:Request) {
 try {const c=await context();if(!c)return response({error:'Inicia sessão para guardar a demonstração.'},401);
 const offset=Number(new URL(req.url).searchParams.get('week')??0);if(!Number.isInteger(offset)||offset<0||offset>3)return response({error:'Semana inválida.'},400);
 const dates=weekDates(offset);
 const saved=await c.db.prepare('SELECT date, normal, vegetarian, soup, dessert FROM menus WHERE workspace = ? AND date >= ? AND date <= ?').bind(c.key,dates[0],dates[4]).all();
 const rows=await c.db.prepare('SELECT student, date, choice FROM meal_choices WHERE workspace = ? AND date >= ? AND date <= ?').bind(c.key,dates[0],dates[4]).all();
 return response({menus:dates.map((d,i)=>saved.results.find(x=>x.date===d)??defaultMenu(d,i)),choices:rows.results});
 }catch(e){console.error('Demo read failed',e);return response({error:'Não foi possível carregar a semana. Tenta novamente.'},503);}
}
export async function POST(req:Request) {
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Pedido inválido.'},403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return response({error:'Pedido inválido.'},415);
 try {const c=await context();if(!c)return response({error:'Inicia sessão para guardar a demonstração.'},401);
 const body=await req.json() as any;
 const dates=[0,1,2,3].flatMap(x=>weekDates(x));
 if(body.type==='choices') {
 if(!students.some(x=>x.id===body.student)||!Array.isArray(body.items)||body.items.length<1||body.items.length>5)return response({error:'Escolhas inválidas.'},400);
 if(new Set(body.items.map((x:any)=>x.date)).size!==body.items.length)return response({error:'Datas repetidas.'},400);
 for(const x of body.items){if(!dates.includes(x.date)||!['normal','vegetarian','none'].includes(x.choice))return response({error:'Escolhas inválidas.'},400);if(new Date()>deadline(x.date))return response({error:'O prazo de marcação deste dia terminou.'},409);}
 await c.db.batch(body.items.map((x:any)=>c.db.prepare('INSERT INTO meal_choices (workspace,student,date,choice,updated) VALUES (?,?,?,?,?) ON CONFLICT(workspace,student,date) DO UPDATE SET choice=excluded.choice,updated=excluded.updated').bind(c.key,body.student,x.date,x.choice,new Date().toISOString())));
 return response({ok:true});
 }
 if(body.type==='menu') {
 const m=body.menu;if(!m||!dates.includes(m.date)||new Date()>deadline(m.date))return response({error:'Já não é possível editar este dia.'},409);
 if(['normal','vegetarian','soup','dessert'].some(k=>typeof m[k]!=='string'||!m[k].trim()||m[k].length>160))return response({error:'Preenche todos os campos (até 160 caracteres).'},400);
 await c.db.prepare('INSERT INTO menus (workspace,date,normal,vegetarian,soup,dessert) VALUES (?,?,?,?,?,?) ON CONFLICT(workspace,date) DO UPDATE SET normal=excluded.normal,vegetarian=excluded.vegetarian,soup=excluded.soup,dessert=excluded.dessert').bind(c.key,m.date,m.normal.trim(),m.vegetarian.trim(),m.soup.trim(),m.dessert.trim()).run();
 return response({ok:true});
 }
 return response({error:'Operação inválida.'},400);
 }catch(e){console.error('Demo save failed',e);return response({error:'Não foi possível guardar. As tuas escolhas continuam no ecrã.'},503);}
}
