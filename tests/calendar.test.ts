import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingStatus,deadline,isServiceDay} from '../app/domain.ts';
import {schoolCalendar} from '../app/school-calendar.ts';

test('hora local de inverno e verão',()=>{
 assert.equal(deadline('2027-01-12').toISOString(),'2027-01-11T18:00:00.000Z');
 assert.equal(deadline('2027-07-13').toISOString(),'2027-07-12T17:00:00.000Z');
});
test('segunda-feira usa sexta-feira anterior',()=>{
 assert.equal(deadline('2027-01-11').toISOString(),'2027-01-08T18:00:00.000Z');
});
test('antes, no instante e depois do prazo',()=>{
 const date='2027-01-12';
 assert.equal(bookingStatus(date,new Date('2027-01-11T17:59:59Z')).open,true);
 assert.equal(bookingStatus(date,new Date('2027-01-11T18:00:00Z')).open,false);
 assert.equal(bookingStatus(date,new Date('2027-01-11T18:00:01Z')).open,false);
});
test('dia sem serviço é recusado e recua prazo',()=>{
 schoolCalendar.noServiceDates.push('2027-01-11','2027-01-13');
 try{
  assert.equal(isServiceDay('2027-01-11'),false);
  assert.equal(bookingStatus('2027-01-11').open,false);
  assert.equal(deadline('2027-01-12').toISOString(),'2027-01-08T18:00:00.000Z');
 }finally{schoolCalendar.noServiceDates.splice(0);}
});
test('data inválida é rejeitada',()=>assert.throws(()=>deadline('2027-02-30')));
