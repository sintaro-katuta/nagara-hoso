import test from 'node:test';
import assert from 'node:assert/strict';
import {programForDate,weeklyPrograms} from '../lib/weekly-programs.mjs';

test('weekday selects the programme and cast uses unique models',()=>{
 assert.equal(programForDate('2026-11-02').title,'何でもマンデー');
 assert.equal(programForDate('2026-11-03').cast.length,1);
 assert.equal(programForDate('2026-11-07').cast.length,1);
 assert.equal(programForDate('2026-11-08').title,'気持ちのひとしお');
 const models=weeklyPrograms.flatMap(program=>program.cast.map(person=>person.voice));
 assert.equal(models.length,12);
 assert.equal(new Set(models).size,models.length);
 assert.equal(programForDate('2026-11-04').cast[1].reading,'あさひな ともしび');
 assert.throws(()=>programForDate('2026-02-30'));
});
