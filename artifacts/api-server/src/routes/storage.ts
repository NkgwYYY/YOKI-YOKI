/**
 * Storage routes — public object serving only.
 *
 * GET /storage/public-objects/*
 *   Streams files from PUBLIC_OBJECT_SEARCH_PATHS (GCS bucket public folder).
 *   No authentication required — used to serve app assets such as evolution video.
 */
import { Readable } from 'stream';
import { Router, type IRouter, type Request, type Response } from 'express';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * GET /storage/public-objects/*filePath
 *
 * Serves public assets from PUBLIC_OBJECT_SEARCH_PATHS unconditionally.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

export default router;
