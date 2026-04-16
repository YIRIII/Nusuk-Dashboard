export type CaptureStage =
  | 'fxtwitter'
  | 'oembed'
  | 'puppeteer_embed'
  | 'puppeteer_direct';

export type MediaKind = 'image' | 'video' | 'gif' | 'none';

export interface CapturedMedia {
  kind: MediaKind;
  image_url?: string;
  video_url?: string;
}

export interface StageSuccess {
  success: true;
  stage: CaptureStage;
  final_url: string;
  author_name: string | null;
  author_handle: string | null;
  text: string | null;
  posted_at: string | null;
  media: CapturedMedia;
  screenshot: Buffer;
  html: string | null;
  duration_ms: number;
}

export interface StageFailure {
  success: false;
  stage: CaptureStage;
  error: string;
  duration_ms: number;
}

export type StageResult = StageSuccess | StageFailure;

export interface FallbackChainResult {
  final: StageSuccess;
  attempts: StageResult[];
}
