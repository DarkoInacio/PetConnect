import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'public', 'chat-fab-icon.png');

await sharp(src).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(root, 'public', 'pwa-192.png'));
await sharp(src).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(root, 'public', 'pwa-512.png'));
console.log('PWA icons: public/pwa-192.png, public/pwa-512.png');
