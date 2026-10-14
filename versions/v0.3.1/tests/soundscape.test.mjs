import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundscape, gainAt, musicForChapter} from '../src/soundscape.js';
class Node {
  gain = {value:0,setTargetAtTime(value){this.value=value;}};
  stopped = false;
  connect(){return this;}
  disconnect(){}
  start(){}
  stop(){assert.equal(this.stopped,false);this.stopped=true;}
}
globalThis.AudioContext=class {
  currentTime=0;state='running';destination={};
  createGain(){return new Node();}
  createBufferSource(){return new Node();}
  async resume(){}
};
test('chapter soundtrack holds one state across the mountain transition',()=>{
  assert.deepEqual([1,2,3,4,5].map(musicForChapter),['quiet','stones','vault','vault','quiet']);
});
test('rapid chapter switches continue from current gains, without a gain jump',()=>{
  const s=new Soundscape();s.buffers=[{},{},{}];s.start();s.context.currentTime=3;
  assert.deepEqual(s.values(),[1,0,0]);s.setState('stones',4);s.context.currentTime=5;
  const before=s.values();assert.deepEqual(before,[.5,.5,0]);s.setState('vault',4);
  assert.deepEqual(s.values(),before);s.context.currentTime=9;assert.deepEqual(s.values(),[0,0,1]);
  assert.equal(s.voices.length,3);
});
test('replay replaces old sources and preserves mute; exit releases all voices',()=>{
  const s=new Soundscape();s.buffers=[{},{},{}];s.start();const old=s.voices.slice();
  s.setMuted(true);s.start();assert.ok(old.every(v=>v.source.stopped));
  assert.equal(s.voices.length,3);assert.equal(s.master.gain.value,0);
  s.stop();assert.equal(s.voices.length,0);
});
test('fades remain bounded and end at exact silence',()=>{
  assert.deepEqual(gainAt([1,0,0],[0,1,0],-1),[1,0,0]);
  assert.deepEqual(gainAt([1,0,0],[0,0,0],2),[0,0,0]);
});
