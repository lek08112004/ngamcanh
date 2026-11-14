// The page's entry point. A visitor who has synced before gets one short look at their cloud
// copy (cloud.js, at most 1.5 s, only when online) before the game reads the save; then the game
// itself is loaded. Without the network, or for a first visit, this costs nothing.
import { boot } from './cloud.js';

await boot(1500);
try {
  await import('./main.js');
} catch (e) {
  console.error(e);
  window.__bootFail('Không tải được thư viện đồ hoạ. Hãy kiểm tra kết nối mạng rồi tải lại trang.');
}
