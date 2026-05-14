export interface StreamLine {
  stage: string;
  progress: number;
  message: string;
  error?: string;
  // optional fields depending on operation
  scene_id?: string;
  oob_score?: number;
  map_id?: string;
}

export interface SearchRequest {
  bbox: [number, number, number, number]; // [lon_min, lat_min, lon_max, lat_max]
  time_range: string;                     // "YYYY-MM-DD/YYYY-MM-DD"
  cloud_cover_threshold: number;          // integer [0, 100]
}

export interface SearchResponse {
  session_id: string;
  scene_id: string;
  datetime: string;
  cloud_cover: number;
}

export interface ThresholdPreviewRequest {
  session_id: string;
  ndvi_veg_min: number;
  bsi_veg_max: number;
  ndwi_water_min: number;
  ndvi_water_max: number;
  bsi_mining_min: number;
  ndvi_mining_max: number;
}

export interface ThresholdPreviewResponse {
  total_valid: number;
  vegetation: number;
  water: number;
  mining: number;
}

export interface TrainRequest {
  session_id: string;
  ndvi_veg_min: number;
  bsi_veg_max: number;
  ndwi_water_min: number;
  ndvi_water_max: number;
  bsi_mining_min: number;
  ndvi_mining_max: number;
}

export interface PredictRequest {
  session_id: string;
}
