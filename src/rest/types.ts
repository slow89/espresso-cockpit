import { z } from "zod";

const optionalNumber = z.number().optional();
const optionalString = z.string().optional();

export const machinePhaseSchema = z.object({
  state: z.string(),
  substate: z.string(),
});

export const machineSnapshotSchema = z.object({
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

export const deviceSummarySchema = z.object({
  name: z.string(),
  id: z.string(),
  state: z.string(),
  type: z.string(),
});

export const workflowProfileSchema = z.object({
  title: optionalString,
  author: optionalString,
  beverage_type: optionalString,
  target_weight: optionalNumber,
  target_volume: optionalNumber,
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
  id: z.string().optional(),
  name: optionalString,
  description: optionalString,
  profile: workflowProfileSchema.optional(),
  context: workflowContextSchema.optional(),
  steamSettings: workflowSettingsSchema.optional(),
  hotWaterData: workflowSettingsSchema.optional(),
  rinseData: workflowSettingsSchema.optional(),
});

export const shotRecordSchema = z
  .object({
    id: z.string().optional(),
    timestamp: z.string().optional(),
    workflow: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
    context: workflowContextSchema.optional(),
    weight: z.number().optional(),
    volume: z.number().optional(),
  })
  .catchall(z.unknown());

export const machineStateChangeSchema = z.enum([
  "idle",
  "sleeping",
  "espresso",
  "steam",
  "hotWater",
  "flush",
]);

export const deviceSummaryListSchema = z.array(deviceSummarySchema);
export const shotRecordListSchema = z.array(shotRecordSchema);

export type MachinePhase = z.infer<typeof machinePhaseSchema>;
export type MachineSnapshot = z.infer<typeof machineSnapshotSchema>;
export type DeviceSummary = z.infer<typeof deviceSummarySchema>;
export type WorkflowProfile = z.infer<typeof workflowProfileSchema>;
export type WorkflowContext = z.infer<typeof workflowContextSchema>;
export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>;
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>;
export type ShotRecord = z.infer<typeof shotRecordSchema>;
export type MachineStateChange = z.infer<typeof machineStateChangeSchema>;
