export function installOfflineControl(nav) {
  if (!('serviceWorker' in navigator)) return;
  const button = document.createElement('button');
  button.textContent = '准备离线';
  button.title = '联网时缓存本版本的模型、音乐和专题图片';
  nav.append(button);
  navigator.serviceWorker.addEventListener('message', event => {
    const m = event.data;
    if (m?.type === 'CACHE_PROGRESS') button.textContent = `离线 ${m.done}/${m.total}`;
    if (m?.type === 'CACHE_READY') { button.disabled=false;button.textContent = '离线已就绪'; }
    if (m?.type === 'CACHE_ERROR') { button.disabled=false;button.textContent='离线准备失败，重试';console.warn('Offline:',m.error); }
  });
  button.onclick = async () => {
    button.disabled = true;button.textContent = '准备中…';
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {scope:'./'});
      let worker = registration.active;
      if (!worker) {
        worker = registration.installing || registration.waiting;
        await new Promise((resolve, reject) => {
          if (!worker) return reject(new Error('Offline worker unavailable'));
          if (worker.state === 'activated') return resolve();
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve();
            if (worker.state === 'redundant') reject(new Error('Offline worker failed'));
          });
        });
      }
      worker.postMessage({type:'PREPARE_CACHE'});
    } catch (error) {button.disabled=false;button.textContent='离线准备失败，重试';console.warn(error);}
  };
}
