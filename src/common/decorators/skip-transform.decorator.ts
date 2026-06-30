import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Đánh dấu route KHÔNG bị TransformInterceptor bọc lại response.
 * Dùng cho các endpoint cần giữ nguyên payload gốc (vd: health-check của Terminus
 * trả { status, info, details } theo contract mà orchestrator mong đợi).
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
