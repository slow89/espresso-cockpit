import { z } from "zod";

const optionalNumber = z.number().nullish();
const optionalString = z.string().nullish();

export const machinePhaseSchema = z.object({
  state: z.string(),
  substate: z.string(),
});

export const machineSnapshotSchema = z.looseObject({
  timestamp: z.string(),
  state: machinePhaseSchema,
  flow: z.number(),
  pressure: z.number(),
  targetFlow: z.number(),
  targetPressure: z.number(),
  mixTemperature: z.number(),
  groupTemperature: z.number(),
  targetMixTemperature: z.number(),
  targetGroupTemperature: z.number(),
  profileFrame: z.number(),
  steamTemperature: z.number(),
});

export const scaleSnapshotSchema = z.looseObject({
  timestamp: z.string(),
  weight: optionalNumber,
  weightFlow: optionalNumber,
  timerValue: optionalNumber,
  batteryLevel: optionalNumber,
});

export const timeToReadyStatusSchema = z.enum([
  "reached",
  "insufficient_data",
  "not_heating",
  "heating",
]);

export const timeToReadySnapshotSchema = z.looseObject({
  currentTemp: optionalNumber,
  formattedTime: optionalString,
  heatingRate: optionalNumber,
  message: optionalString,
  remainingTimeMs: optionalNumber,
  status: timeToReadyStatusSchema,
  targetTemp: optionalNumber,
  timestamp: optionalNumber,
});

export const machineWaterLevelsSchema = z.looseObject({
  currentLevel: optionalNumber,
  refillLevel: optionalNumber,
});

export const heartbeatResponseSchema = z.looseObject({
  timeout: z.number(),
});

export const presenceSettingsSchema = z.looseObject({
  userPresenceEnabled: z.boolean(),
  sleepTimeoutMinutes: z.number(),
  schedules: z.array(z.unknown()).default([]),
});

export const bridgeSettingsSchema = z.looseObject({
  preferredMachineId: optionalString,
  preferredScaleId: optionalString,
  scalePowerMode: optionalString,
});

export const displayPlatformSupportSchema = z.looseObject({
  brightness: z.boolean(),
  wakeLock: z.boolean(),
});

export const displayStateSchema = z.looseObject({
  wakeLockEnabled: z.boolean(),
  wakeLockOverride: z.boolean(),
  brightness: z.number(),
  requestedBrightness: z.number(),
  lowBatteryBrightnessActive: z.boolean(),
  platformSupported: displayPlatformSupportSchema,
});

export const deviceSummarySchema = z.object({
  name: z.string(),
  id: z.string(),
  state: z.string(),
  type: z.string(),
});

export const workflowProfileSchema = z.looseObject({
  version: optionalString,
  title: optionalString,
  notes: optionalString,
  author: optionalString,
  beverage_type: optionalString,
  target_weight: optionalNumber,
  target_volume: optionalNumber,
  target_volume_count_start: optionalNumber,
  tank_temperature: optionalNumber,
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const workflowContextSchema = z.object({
  targetDoseWeight: optionalNumber,
  targetYield: optionalNumber,
  grinderModel: optionalString,
  grinderSetting: optionalString,
  coffeeName: optionalString,
  coffeeRoaster: optionalString,
  finalBeverageType: optionalString,
});

export const workflowSettingsSchema = z.object({
  targetTemperature: optionalNumber,
  duration: optionalNumber,
  flow: optionalNumber,
  volume: optionalNumber,
});

export const workflowRecordSchema = z.object({
  id: z.string().nullish(),
  name: optionalString,
  description: optionalString,
  profile: workflowProfileSchema.optional(),
  context: workflowContextSchema.optional(),
  steamSettings: workflowSettingsSchema.optional(),
  hotWaterData: workflowSettingsSchema.optional(),
  rinseData: workflowSettingsSchema.optional(),
});

export const profileRecordSchema = z.object({
  id: z.string(),
  profile: workflowProfileSchema,
  metadataHash: z.string().nullish(),
  compoundHash: z.string().nullish(),
  parentId: z.string().nullish(),
  visibility: z.enum(["visible", "hidden", "deleted"]).nullish(),
  isDefault: z.boolean().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const visualizerPluginSettingsSchema = z.looseObject({
  Username: optionalString,
  Password: optionalString,
  AutoUpload: z.boolean().optional(),
  LengthThreshold: optionalNumber,
});

export const visualizerCredentialCheckSchema = z.looseObject({
  valid: z.boolean(),
});

export const visualizerImportResultSchema = z.looseObject({
  success: z.boolean().optional(),
  profileTitle: optionalString,
  profileId: optionalString,
  shotId: optionalString,
  workflowResult: z.unknown().optional(),
  error: optionalString,
});

export const shotSummarySchema = z
  .object({
    id: z.string().nullish(),
    timestamp: z.string().nullish(),
    workflow: workflowRecordSchema.optional(),
  })
  .catchall(z.unknown());

export const shotScaleMeasurementSchema = z.looseObject({
  timestamp: z.string(),
  weight: optionalNumber,
  weightFlow: optionalNumber,
  timerValue: optionalNumber,
  batteryLevel: optionalNumber,
});

export const shotMeasurementSchema = z.object({
  machine: machineSnapshotSchema,
  scale: shotScaleMeasurementSchema.nullish(),
  volume: optionalNumber,
});

export const shotDetailSchema = z
  .object({
    id: z.string().nullish(),
    timestamp: z.string().nullish(),
    measurements: z.array(shotMeasurementSchema),
    workflow: workflowRecordSchema.optional(),
  })
  .catchall(z.unknown());

export const shotListResponseSchema = z
  .union([
    z.array(shotSummarySchema),
    z.object({
      items: z.array(shotSummarySchema),
      total: optionalNumber,
      limit: optionalNumber,
      offset: optionalNumber,
    }),
  ])
  .transform((value) => {
    if (Array.isArray(value)) {
      return {
        items: value,
        total: value.length,
        limit: value.length,
        offset: 0,
      };
    }

    const itemCount = value.items.length;

    return {
      items: value.items,
      total: value.total ?? itemCount,
      limit: value.limit ?? itemCount,
      offset: value.offset ?? 0,
    };
  });

export const machineStateChangeSchema = z.enum([
  "idle",
  "sleeping",
  "espresso",
  "steam",
  "hotWater",
  "flush",
]);

export const deviceSummaryListSchema = z.array(deviceSummarySchema);
export const profileRecordListSchema = z.array(profileRecordSchema);

export type MachinePhase = z.infer<typeof machinePhaseSchema>;
export type MachineSnapshot = z.infer<typeof machineSnapshotSchema>;
export type ScaleSnapshot = z.infer<typeof scaleSnapshotSchema>;
export type TimeToReadySnapshot = z.infer<typeof timeToReadySnapshotSchema>;
export type MachineWaterLevels = z.infer<typeof machineWaterLevelsSchema>;
export type HeartbeatResponse = z.infer<typeof heartbeatResponseSchema>;
export type PresenceSettings = z.infer<typeof presenceSettingsSchema>;
export type BridgeSettings = z.infer<typeof bridgeSettingsSchema>;
export type DisplayPlatformSupport = z.infer<typeof displayPlatformSupportSchema>;
export type DisplayState = z.infer<typeof displayStateSchema>;
export type DeviceSummary = z.infer<typeof deviceSummarySchema>;
export type WorkflowProfile = z.infer<typeof workflowProfileSchema>;
export type WorkflowContext = z.infer<typeof workflowContextSchema>;
export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>;
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>;
export type ProfileRecord = z.infer<typeof profileRecordSchema>;
export type VisualizerPluginSettings = z.infer<typeof visualizerPluginSettingsSchema>;
export type VisualizerCredentialCheck = z.infer<typeof visualizerCredentialCheckSchema>;
export type VisualizerImportResult = z.infer<typeof visualizerImportResultSchema>;
export type ShotRecord = z.infer<typeof shotSummarySchema>;
export type ShotMeasurement = z.infer<typeof shotMeasurementSchema>;
export type ShotDetailRecord = z.infer<typeof shotDetailSchema>;
export type ShotListResponse = z.infer<typeof shotListResponseSchema>;
export type MachineStateChange = z.infer<typeof machineStateChangeSchema>;
