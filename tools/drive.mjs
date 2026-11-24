// Developer tool: drive the locally served site in headless Chrome over the DevTools
// protocol, with nothing to install (Node 22+ has fetch and WebSocket built in).
// Unlike tools/shot.sh this runs in real time, so it can hold keys down, click buttons,
// wait for things to happen and read state back.
//
//   import { launch } from './drive.mjs';
//   const b = await launch();
//   await b.goto('http://127.0.0.1:8765/?auto=view&q=low&debug=1');
//   await b.hold('w', 2000);
//   console.log(await b.eval('window.__av.camBase.z'));
//   await b.close();
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = { w: 87, a: 65, s: 83, d: 68, g: 71, n: 78, shift: 16, ' ': 32 };

// gpu: ask headless Chrome for the real graphics card instead of its software renderer.
// headful: open a normal, visible window (the surest way to get the real card).
// vsync: false lifts the display's frame cap, so a frame time measures the work, not the screen.
export async function launch({ port = 9333, size = [1280, 720], gpu = false, headful = false, vsync = true } = {}) {
  const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const profile = mkdtempSync(join(tmpdir(), 'aurora-vale-'));      // a fresh profile: no stale module cache
  const proc = spawn(chrome, [
    ...(headful ? [] : ['--headless=new']),
    ...(gpu ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] : []),
    ...(vsync ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']),
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    `--window-size=${size[0]},${size[1]}`, '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank',
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 150 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch (e) { await sleep(100); }
  }
  if (!targets) throw new Error('Chrome did not start');
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      logs.push(`EXCEPTION: ${(d.exception && d.exception.description) || d.text}`);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  await send('Page.enable');

  const b = {
    logs,
    send,
    async goto(url) { await send('Page.navigate', { url }); await sleep(300); },
    /** evaluate an expression in the page (promises are awaited) and return its value */
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expression, timeout = 30000, what = expression) {
      const t0 = Date.now();
      for (;;) {
        let v = false;
        try { v = await b.eval(expression); } catch (e) { /* page still loading */ }
        if (v) return v;
        if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for: ${what}`);
        await sleep(200);
      }
    },
    async key(type, k) {
      const key = k === 'shift' ? 'Shift' : k;
      await send('Input.dispatchKeyEvent', {
        type, key, code: k === 'shift' ? 'ShiftLeft' : k === ' ' ? 'Space' : `Key${k.toUpperCase()}`,
        windowsVirtualKeyCode: KEYS[k], nativeVirtualKeyCode: KEYS[k],
      });
    },
    /** hold one or more keys down for a while, in real time */
    async hold(keys, ms) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) await b.key('keyDown', k);
      await sleep(ms);
      for (const k of list.reverse()) await b.key('keyUp', k);
    },
    async click(selector) { await b.eval(`document.querySelector(${JSON.stringify(selector)}).click()`); },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async close() {
      try { ws.close(); } catch (e) { /* ignore */ }
      proc.kill();
      await sleep(400);
      try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Chrome may still hold a lock */ }
    },
  };
  return b;
}
