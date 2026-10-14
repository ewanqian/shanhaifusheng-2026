import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseAt, LENGTH, XR_HERO, pinchEdge} from '../src/sequence.js';
test('sequence reaches every chapter at real elapsed time, including dropped frames', () => {
  assert.equal(LENGTH,90);
  for(const [t,c] of [[0,1],[9.9,1],[10,2],[40,3],[48,4],[78,5]])assert.equal(phaseAt(t).chapter,c);
  assert.equal(phaseAt(89).done,false);assert.equal(phaseAt(90).done,true);
  assert.equal(phaseAt(50).elapsed,2);
});
test('hero occupies less than 16 degrees and stays over two meters away',()=>{
  assert.ok(XR_HERO.distance-XR_HERO.width/2>2);
  assert.ok(2*Math.atan(XR_HERO.width/2/XR_HERO.distance)*180/Math.PI<16);
});
test('a held pinch emits no repeated release actions',()=>{
  let held=false,count=0;
  for(const d of [.08,.02,...Array(300).fill(.015),.06,.08]){const r=pinchEdge(held,d);held=r.held;if(r.released)count++;}
  assert.equal(count,1);
});
