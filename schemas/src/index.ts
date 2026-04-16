import { z } from 'zod';

export const UrlSchema = z.string().url();

export const CaptureRequestSchema = z.object({
  url: UrlSchema,
});
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

export const BatchCaptureRequestSchema = z.object({
  urls: z.array(UrlSchema).min(1).max(100),
  origin: z.enum(['individual', 'company']).default('individual'),
  company_id: z.string().uuid().nullable().optional(),
  /** URLs to forcibly recapture (skip dedupe check, replace existing). */
  force_recapture_urls: z.array(UrlSchema).optional(),
});
export type BatchCaptureRequest = z.infer<typeof BatchCaptureRequestSchema>;

export const CaptureRequestV2Schema = z.object({
  url: UrlSchema,
  origin: z.enum(['individual', 'company']).default('individual'),
  company_id: z.string().uuid().nullable().optional(),
  /** Skip dedupe check and replace the existing post with the same URL. */
  force_recapture: z.boolean().optional(),
});
export type CaptureRequestV2 = z.infer<typeof CaptureRequestV2Schema>;

export const MediaTypeSchema = z.discriminatedUnion('media_type', [
  z.object({ media_type: z.literal('image'), url: UrlSchema }),
  z.object({
    media_type: z.literal('video'),
    thumbnail_url: UrlSchema,
    video_url: UrlSchema,
  }),
  z.object({ media_type: z.literal('gif'), url: UrlSchema }),
  z.object({ media_type: z.literal('none') }),
]);
export type Media = z.infer<typeof MediaTypeSchema>;

export const PostsListQuerySchema = z.object({
  kind: z.enum(['all', 'tweet', 'article']).default('all'),
  review: z.enum(['all', 'reviewed', 'unreviewed']).default('all'),
  origin: z.enum(['all', 'individual', 'company']).default('all'),
  company: z.string().uuid().optional(),
  date_range: z.enum(['all', '24h', '7d', '30d']).default('all'),
  sort: z.enum(['posted_desc', 'posted_asc', 'captured_desc']).default('posted_desc'),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  deleted: z.enum(['true', 'false']).optional(),
});
export type PostsListQuery = z.infer<typeof PostsListQuerySchema>;

export const PostPatchSchema = z.object({
  reviewed: z.boolean().optional(),
  origin: z.enum(['individual', 'company']).optional(),
  company_id: z.string().uuid().nullable().optional(),
  title_override: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  posted_at: z.string().datetime().optional(),
});
export type PostPatch = z.infer<typeof PostPatchSchema>;
