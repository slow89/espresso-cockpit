import { describe, expect, it } from "vitest";

import {
  bridgeSettingsSchema,
  displayStateSchema,
  heartbeatResponseSchema,
  machineStateSchema,
  machineCalibrationSchema,
  machineSnapshotSchema,
  machineWaterLevelsSchema,
  scaleSnapshotSchema,
  timeToReadySnapshotSchema,
} from "./types";

describe("bridge realtime schemas", () => {
  it("accepts bridge machine states", () => {
    expect(machineStateSchema.options).toEqual([
      "booting",
      "busy",
      "idle",
      "schedIdle",
      "sleeping",
      "heating",
      "preheating",
      "espresso",
      "hotWater",
      "flush",
      "steam",
      "steamRinse",
      "skipStep",
      "cleaning",
      "descaling",
      "calibration",
      "selfTest",
      "airPurge",
      "needsWater",
      "error",
      "fwUpgrade",
    ]);
  });

  it("accepts heartbeat responses", () => {
    expect(
      heartbeatResponseSchema.parse({
        timeout: 1800,
      }),
    ).toEqual({
      timeout: 1800,
    });
  });

  it("accepts bridge settings with preferred scale metadata", () => {
    expect(
      bridgeSettingsSchema.parse({
        preferredMachineId: "machine-1",
        preferredScaleId: "scale-1",
        scalePowerMode: "disabled",
        volumeFlowMultiplier: 0.3,
        weightFlowMultiplier: 1.2,
      }),
    ).toMatchObject({
      preferredMachineId: "machine-1",
      preferredScaleId: "scale-1",
      weightFlowMultiplier: 1.2,
    });
  });

  it("accepts machine calibration settings", () => {
    expect(
      machineCalibrationSchema.parse({
        flowMultiplier: 0.96,
      }),
    ).toEqual({
      flowMultiplier: 0.96,
    });
  });

  it("accepts websocket scale snapshots", () => {
    expect(
      scaleSnapshotSchema.parse({
        timestamp: "2026-03-22T17:44:32.386380",
        weight: 26.334892905092403,
        batteryLevel: 100,
        timerValue: null,
      }),
    ).toMatchObject({
      batteryLevel: 100,
      weight: 26.334892905092403,
    });
  });

  it("accepts machine water level updates", () => {
    expect(
      machineWaterLevelsSchema.parse({
        currentLevel: 50,
        refillLevel: 5,
      }),
    ).toEqual({
      currentLevel: 50,
      refillLevel: 5,
    });
  });

  it("allows forward-compatible machine snapshots", () => {
    expect(
      machineSnapshotSchema.parse({
        timestamp: "2026-03-22T17:42:56.193771",
        state: {
          state: "idle",
          substate: "idle",
        },
        flow: 0,
        pressure: 0,
        targetFlow: 0,
        targetPressure: 0,
        mixTemperature: 83.5,
        groupTemperature: 83.5,
        targetMixTemperature: 83.5,
        targetGroupTemperature: 83.5,
        profileFrame: 0,
        steamTemperature: 150,
        extraField: "future",
      }),
    ).toMatchObject({
      extraField: "future",
      mixTemperature: 83.5,
    });
  });

  it("accepts display websocket snapshots", () => {
    expect(
      displayStateSchema.parse({
        wakeLockEnabled: true,
        wakeLockOverride: false,
        brightness: 80,
        requestedBrightness: 80,
        lowBatteryBrightnessActive: false,
        platformSupported: {
          brightness: true,
          wakeLock: true,
        },
        extraField: "future",
      }),
    ).toMatchObject({
      brightness: 80,
      extraField: "future",
      platformSupported: {
        brightness: true,
        wakeLock: true,
      },
    });
  });

  it("accepts time-to-ready plugin snapshots", () => {
    expect(
      timeToReadySnapshotSchema.parse({
        currentTemp: 90,
        formattedTime: "00:45",
        heatingRate: 0.2,
        message: "Estimated 00:45 remaining",
        remainingTimeMs: 45_000,
        status: "heating",
        targetTemp: 93,
        timestamp: 1_743_194_400_000,
      }),
    ).toMatchObject({
      currentTemp: 90,
      remainingTimeMs: 45_000,
      status: "heating",
    });
  });
});
