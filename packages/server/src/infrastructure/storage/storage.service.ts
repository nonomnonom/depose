import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { appConfig } from '../../config/app.config.js';

@Injectable()
export class StorageService {
  private readonly root = resolve(process.cwd(), appConfig.storage.localPath);

  private pathFor(key: string): string {
    const path = resolve(this.root, key);
    const rel = relative(this.root, path);
    if (rel.startsWith('..') || rel === '' || rel.includes(`..${sep}`)) {
      throw new Error('Invalid storage key');
    }
    return path;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }
}
