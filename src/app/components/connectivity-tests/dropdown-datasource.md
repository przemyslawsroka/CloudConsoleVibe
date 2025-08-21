# Dropdown Datasources for Connectivity Test Page

This document outlines the datasources for the dynamic dropdowns on the "Create Connectivity Test" page.

## Source Endpoint (`app-source-endpoint`)

| Dropdown Field                | Service Class              | Method                     | GCP API Endpoint (Expected)                                      | Status                |
| ----------------------------- | -------------------------- | -------------------------- | ---------------------------------------------------------------- | --------------------- |
| **VPC Network Project**       | `ProjectService`           | `loadProjects()`           | `https://cloudresourcemanager.googleapis.com/v1/projects`        | Implemented           |
| **VPC Network**               | `ComputeEngineService`     | `getVpcNetworks()`         | `https://compute.googleapis.com/compute/v1/projects/{projectId}/global/networks` | Using Mock Data       |
| **Connection Project**        | `ProjectService`           | `loadProjects()`           | `https://cloudresourcemanager.googleapis.com/v1/projects`        | Implemented           |
| **Resource (VPN Tunnel)**     | `ComputeEngineService`     | `getVpnTunnels()`          | `https://compute.googleapis.com/compute/v1/projects/{projectId}/regions/{region}/vpnTunnels` | Implemented           |
| **Resource (Interconnect)**   | `ComputeEngineService`     | `getInterconnects()`       | `https://compute.googleapis.com/compute/v1/projects/{projectId}/global/interconnects` | Implemented           |
| **Resource (NCC Router)**     | `NetworkConnectivityService` | `getNccRouters()`        | `https://networkconnectivity.googleapis.com/v1/projects/{projectId}/locations/global/hubs` | Implemented           |
| **Source Instance**           | `ResourceLoaderService`    | `loadVmInstances()`        | `https://compute.googleapis.com/compute/v1/projects/{projectId}/aggregated/instances` | Implemented (via `ComputeEngineService`) |
| **GKE Cluster**               | `ResourceLoaderService`    | `loadGkeClusters()`        | `https://container.googleapis.com/v1/projects/{projectId}/locations/-/clusters` | Implemented (via `GkeClusterService`) |
| **Cloud Run Service**         | `ResourceLoaderService`    | `loadCloudRunServices()`   | `https://run.googleapis.com/v1/projects/{projectId}/locations/-/services` | Implemented (via `CloudRunService`) |
| **Cloud Function**            | `ResourceLoaderService`    | `loadCloudFunctions()`     | `https://cloudfunctions.googleapis.com/v1/projects/{projectId}/locations/-/functions` | Implemented (via `CloudFunctionsService`) |
| **Cloud SQL Instance**        | `ResourceLoaderService`    | `loadCloudSqlInstances()`  | `https://sqladmin.googleapis.com/v1beta4/projects/{projectId}/instances` | Implemented (via `CloudSqlService`) |
| **AlloyDB Instance**          | `ResourceLoaderService`    | `loadAlloyDbInstances()`   | `https://alloydb.googleapis.com/v1/projects/{projectId}/locations/-/clusters` | Implemented (via `AlloyDbService`) |

## Destination Endpoint (`app-destination-endpoint`)

| Dropdown Field           | Service Class           | Method                  | GCP API Endpoint (Expected)                                      | Status                |
| ------------------------ | ----------------------- | ----------------------- | ---------------------------------------------------------------- | --------------------- |
| **Google API**           | N/A                     | N/A                     | N/A                                                              | Hardcoded             |
| **Destination Instance** | `ResourceLoaderService` | `loadVmInstances()`     | `https://compute.googleapis.com/compute/v1/projects/{projectId}/aggregated/instances` | Implemented (via `ComputeEngineService`) |
| **GKE Cluster**          | `ResourceLoaderService` | `loadGkeClusters()`     | `https://container.googleapis.com/v1/projects/{projectId}/locations/-/clusters` | Implemented (via `GkeClusterService`) |
| **Cloud Run Service**    | `ResourceLoaderService` | `loadCloudRunServices()`| `https://run.googleapis.com/v1/projects/{projectId}/locations/-/services` | Implemented (via `CloudRunService`) |
| **Cloud Function**       | `ResourceLoaderService` | `loadCloudFunctions()`  | `https://cloudfunctions.googleapis.com/v1/projects/{projectId}/locations/-/functions` | Implemented (via `CloudFunctionsService`) |
| **Cloud SQL Instance**   | `ResourceLoaderService` | `loadCloudSqlInstances()`| `https://sqladmin.googleapis.com/v1beta4/projects/{projectId}/instances` | Implemented (via `CloudSqlService`) |
| **AlloyDB Instance**     | `ResourceLoaderService` | `loadAlloyDbInstances()`| `https://alloydb.googleapis.com/v1/projects/{projectId}/locations/-/clusters` | Implemented (via `AlloyDbService`) |

