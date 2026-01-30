import { z } from 'zod';
import { coordinateSchema, dateSchema, sanitizeString } from './common';

export const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const bookingCreateSchema = z.object({
  load_id: z.string().min(1).max(100),
  origin: z.string().min(1).max(500).transform(sanitizeString),
  destination: z.string().min(1).max(500).transform(sanitizeString),
  pickup_date: dateSchema,
  rate: z.number().min(0).max(1000000),
  equipment: z.string().min(1).max(100).transform(sanitizeString),
  broker: z.string().min(1).max(200).transform(sanitizeString),
});

export const searchCriteriaSchema = z.object({
  origin_city: z.string().max(100).transform(sanitizeString),
  origin_state: z.string().length(2).optional(),
  dest_city: z.string().max(100).transform(sanitizeString),
  destination_state: z.string().length(2).optional(),
  equipment_type: z.enum(['Van', 'Reefer', 'Flatbed', 'Power Only', 'Any']),
  min_rate: z.number().min(0).optional(),
  max_deadhead: z.number().min(0).max(1000).optional(),
});

export const interestedLoadSchema = z.object({
  cloudtrucks_load_id: z.string().min(1).max(100),
  details: z.record(z.unknown()),
});

export const patchStatusSchema = z.object({
  ids: z.array(z.number().int().positive()),
  status: z.enum(['interested', 'trashed', 'archived']),
});
