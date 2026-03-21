import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { createBridgeClient } from "@/rest/client";
import { queryClient } from "@/rest/query-client";
import { type MachineStateChange } from "@/rest/types";
import { useBridgeConfigStore } from "@/stores/bridge-config-store";

function getClient() {
  return createBridgeClient(useBridgeConfigStore.getState().gatewayUrl);
}

export const bridgeQueryKeys = {
  all: ["bridge"] as const,
  machineState: () => [...bridgeQueryKeys.all, "machine-state"] as const,
  workflow: () => [...bridgeQueryKeys.all, "workflow"] as const,
  devices: () => [...bridgeQueryKeys.all, "devices"] as const,
  shots: () => [...bridgeQueryKeys.all, "shots"] as const,
};

export const machineStateQueryOptions = () =>
  queryOptions({
    queryKey: bridgeQueryKeys.machineState(),
    queryFn: () => getClient().getMachineState(),
  });

export const workflowQueryOptions = () =>
  queryOptions({
    queryKey: bridgeQueryKeys.workflow(),
    queryFn: () => getClient().getWorkflow(),
  });

export const devicesQueryOptions = () =>
  queryOptions({
    queryKey: bridgeQueryKeys.devices(),
    queryFn: () => getClient().listDevices(),
  });

export const shotsQueryOptions = () =>
  queryOptions({
    queryKey: bridgeQueryKeys.shots(),
    queryFn: () => getClient().listShots(),
  });

export function useMachineStateQuery() {
  return useQuery(machineStateQueryOptions());
}

export function useWorkflowQuery() {
  return useQuery(workflowQueryOptions());
}

export function useDevicesQuery() {
  return useQuery(devicesQueryOptions());
}

export function useShotsQuery() {
  return useQuery(shotsQueryOptions());
}

export function useScanDevicesMutation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => getClient().scanDevices(),
    onSuccess: (devices) => {
      client.setQueryData(bridgeQueryKeys.devices(), devices);
    },
  });
}

export function useUpdateWorkflowMutation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      getClient().updateWorkflow(patch),
    onSuccess: (workflow) => {
      client.setQueryData(bridgeQueryKeys.workflow(), workflow);
    },
  });
}

export function useRequestMachineStateMutation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (nextState: MachineStateChange) =>
      getClient().requestMachineState(nextState),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: bridgeQueryKeys.machineState(),
      });
    },
  });
}

export async function prefetchOverviewQueries() {
  await Promise.all([
    queryClient.prefetchQuery(machineStateQueryOptions()),
    queryClient.prefetchQuery(workflowQueryOptions()),
    queryClient.prefetchQuery(shotsQueryOptions()),
  ]);
}

export async function prefetchWorkflowQuery() {
  await queryClient.prefetchQuery(workflowQueryOptions());
}

export async function prefetchShotsQuery() {
  await queryClient.prefetchQuery(shotsQueryOptions());
}

export async function prefetchDevicesQuery() {
  await queryClient.prefetchQuery(devicesQueryOptions());
}
