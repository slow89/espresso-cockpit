import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createBridgeClient,
  normalizeGatewayUrl,
} from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { type MachineStateChange } from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";

export function getGatewayOrigin() {
  return normalizeGatewayUrl(useBridgeConfigStore.getState().gatewayUrl);
}

function useGatewayOrigin() {
  return useBridgeConfigStore((state) => normalizeGatewayUrl(state.gatewayUrl));
}

function getClient(gatewayOrigin = getGatewayOrigin()) {
  return createBridgeClient(gatewayOrigin);
}

export const bridgeQueryKeys = {
  root: ["bridge"] as const,
  all: (gatewayOrigin: string) => [...bridgeQueryKeys.root, gatewayOrigin] as const,
  settings: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "settings"] as const,
  machineState: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "machine-state"] as const,
  workflow: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "workflow"] as const,
  profiles: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "profiles"] as const,
  profile: (gatewayOrigin: string, id: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "profiles", id] as const,
  devices: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "devices"] as const,
  presenceSettings: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "presence-settings"] as const,
  shots: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "shots"] as const,
  shot: (gatewayOrigin: string, id: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "shots", id] as const,
  visualizerSettings: (gatewayOrigin: string) =>
    [...bridgeQueryKeys.all(gatewayOrigin), "visualizer-settings"] as const,
};

export const machineStateQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.machineState(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).getMachineState(),
  });

export const bridgeSettingsQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.settings(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).getSettings(),
  });

export const workflowQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.workflow(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).getWorkflow(),
  });

export const devicesQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.devices(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).listDevices(),
  });

export const profilesQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.profiles(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).listProfiles(),
  });

export const presenceSettingsQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.presenceSettings(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).getPresenceSettings(),
  });

export const shotsQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.shots(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).listShots(),
  });

export const visualizerSettingsQueryOptions = (gatewayOrigin = getGatewayOrigin()) =>
  queryOptions({
    queryKey: bridgeQueryKeys.visualizerSettings(gatewayOrigin),
    queryFn: () => getClient(gatewayOrigin).getVisualizerSettings(),
  });

export const shotQueryOptions = (gatewayOrigin = getGatewayOrigin(), id: string) =>
  queryOptions({
    queryKey: bridgeQueryKeys.shot(gatewayOrigin, id),
    queryFn: () => getClient(gatewayOrigin).getShot(id),
    enabled: Boolean(id),
  });

export function useMachineStateQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(machineStateQueryOptions(gatewayOrigin));
}

export function useBridgeSettingsQuery(
  options?: {
    refetchInterval?: number | false;
  },
) {
  const gatewayOrigin = useGatewayOrigin();

  return useQuery({
    ...bridgeSettingsQueryOptions(gatewayOrigin),
    ...options,
  });
}

export function useWorkflowQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(workflowQueryOptions(gatewayOrigin));
}

export function useDevicesQuery(
  options?: {
    refetchInterval?: number | false;
  },
) {
  const gatewayOrigin = useGatewayOrigin();

  return useQuery({
    ...devicesQueryOptions(gatewayOrigin),
    ...options,
  });
}

export function useProfilesQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(profilesQueryOptions(gatewayOrigin));
}

export function usePresenceSettingsQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(presenceSettingsQueryOptions(gatewayOrigin));
}

export function useShotsQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(shotsQueryOptions(gatewayOrigin));
}

export function useShotQuery(id: string | null | undefined) {
  const gatewayOrigin = useGatewayOrigin();

  return useQuery({
    ...shotQueryOptions(gatewayOrigin, id ?? ""),
    enabled: Boolean(id),
  });
}

export function useVisualizerSettingsQuery() {
  const gatewayOrigin = useGatewayOrigin();
  return useQuery(visualizerSettingsQueryOptions(gatewayOrigin));
}

export function useScanDevicesMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (options?: { connect?: boolean }) =>
      getClient(gatewayOrigin).scanDevices(options),
    onSuccess: (devices) => {
      client.setQueryData(bridgeQueryKeys.devices(gatewayOrigin), devices);
    },
  });
}

export function useConnectDeviceMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (deviceId: string) => getClient(gatewayOrigin).connectDevice(deviceId),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: bridgeQueryKeys.devices(gatewayOrigin),
      });
    },
  });
}

export function useDisconnectDeviceMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (deviceId: string) => getClient(gatewayOrigin).disconnectDevice(deviceId),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: bridgeQueryKeys.devices(gatewayOrigin),
      });
    },
  });
}

export function useUpdateWorkflowMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      getClient(gatewayOrigin).updateWorkflow(patch),
    onSuccess: (workflow) => {
      client.setQueryData(bridgeQueryKeys.workflow(gatewayOrigin), workflow);
    },
  });
}

export function useUpdatePresenceSettingsMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (patch: {
      sleepTimeoutMinutes?: number;
      userPresenceEnabled?: boolean;
    }) => getClient(gatewayOrigin).updatePresenceSettings(patch),
    onSuccess: (settings) => {
      client.setQueryData(bridgeQueryKeys.presenceSettings(gatewayOrigin), settings);
    },
  });
}

export function useUpdateBridgeSettingsMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (settings: {
      preferredMachineId?: string | null;
      preferredScaleId?: string | null;
      scalePowerMode?: string | null;
    }) => getClient(gatewayOrigin).updateSettings(settings),
    onSuccess: async (_, variables) => {
      const previousSettings = client.getQueryData(bridgeQueryKeys.settings(gatewayOrigin));

      client.setQueryData(bridgeQueryKeys.settings(gatewayOrigin), (current) => ({
        ...(typeof current === "object" && current ? (current as Record<string, unknown>) : {}),
        ...variables,
      }));

      try {
        await client.invalidateQueries({
          queryKey: bridgeQueryKeys.settings(gatewayOrigin),
        });
      } catch (error) {
        client.setQueryData(bridgeQueryKeys.settings(gatewayOrigin), previousSettings);
        throw error;
      }
    },
  });
}

export function useUpdateMachineWaterLevelsMutation() {
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (levels: {
      refillLevel: number;
    }) => getClient(gatewayOrigin).updateMachineWaterLevels(levels),
  });
}

export function useUpdateVisualizerSettingsMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (settings: {
      Username?: string | null;
      Password?: string | null;
      AutoUpload?: boolean;
      LengthThreshold?: number | null;
    }) => getClient(gatewayOrigin).updateVisualizerSettings(settings),
    onSuccess: (settings) => {
      client.setQueryData(bridgeQueryKeys.visualizerSettings(gatewayOrigin), settings);
    },
  });
}

export function useVerifyVisualizerCredentialsMutation() {
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      getClient(gatewayOrigin).verifyVisualizerCredentials(credentials),
  });
}

export function useImportVisualizerProfileMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (shareCode: string) =>
      getClient(gatewayOrigin).importVisualizerProfile(shareCode),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: bridgeQueryKeys.profiles(gatewayOrigin),
      });
    },
  });
}

export function useRequestMachineStateMutation() {
  const client = useQueryClient();
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: (nextState: MachineStateChange) =>
      getClient(gatewayOrigin).requestMachineState(nextState),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: bridgeQueryKeys.machineState(gatewayOrigin),
      });
    },
  });
}

export function useTareScaleMutation() {
  const gatewayOrigin = useGatewayOrigin();

  return useMutation({
    mutationFn: () => getClient(gatewayOrigin).tareScale(),
  });
}

export async function prefetchOverviewQueries() {
  const gatewayOrigin = getGatewayOrigin();

  await Promise.all([
    queryClient.prefetchQuery(machineStateQueryOptions(gatewayOrigin)),
    queryClient.prefetchQuery(workflowQueryOptions(gatewayOrigin)),
    queryClient.prefetchQuery(devicesQueryOptions(gatewayOrigin)),
    queryClient.prefetchQuery(shotsQueryOptions(gatewayOrigin)),
  ]);
}

export async function prefetchWorkflowQuery() {
  const gatewayOrigin = getGatewayOrigin();

  await Promise.all([
    queryClient.prefetchQuery(workflowQueryOptions(gatewayOrigin)),
    queryClient.prefetchQuery(profilesQueryOptions(gatewayOrigin)),
  ]);
}

export async function prefetchShotsQuery() {
  await queryClient.prefetchQuery(shotsQueryOptions(getGatewayOrigin()));
}

export async function prefetchDevicesQuery() {
  await queryClient.prefetchQuery(devicesQueryOptions(getGatewayOrigin()));
}
