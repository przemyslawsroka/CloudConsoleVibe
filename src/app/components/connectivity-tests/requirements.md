# Connectivity Test Form - Functional Requirements

This document outlines the functional requirements for the "Create Connectivity Test" form. The form allows users to configure and initiate a network connectivity test between two specified endpoints.

## I. General Requirements

1.  **Form Structure**: The form is divided into three main sections:
    *   Source Endpoint Configuration
    *   Destination Endpoint Configuration
    *   Protocol and Test Name

2.  **Dynamic UI**: The form shall dynamically display input fields based on the selected endpoint types and sub-options.

3.  **Validation**: All required fields must be validated. The "CREATE" button shall be disabled until all validation rules are met.

4.  **Test Name Generation**: The test name shall be automatically generated based on the selected source and destination endpoints. The user can override the generated name.

5.  **Project Context**: The form shall be aware of the currently selected GCP project and pre-fill project-related fields where applicable.

## II. Source Endpoint Configuration

The user must select one of the following source endpoint types:

### 1. IP Address

*   **Sub-flow**:
    1.  User enters a valid IP address.
    2.  User selects the IP address type:
        *   **Google Cloud VPC IP**:
            *   User selects the VPC Network Project.
            *   User selects the VPC Network.
        *   **Non-Google Cloud Private IP**:
            *   User selects the Connection type (VPN Tunnel, Interconnect Attachment, NCC Router Appliance).
            *   User selects the Project for the connection.
            *   User selects the specific connection resource (e.g., VPN tunnel name).
        *   **Public IP**: No further input required.
        *   **Let the test determine**: No further input required.
*   **Data Sources**:
    *   `ProjectService`: To list available GCP projects.
    *   `ComputeEngineService`: To list VPC networks.

### 2. My IP Address

*   **Sub-flow**:
    1.  The form automatically detects the user's public IP address and displays it.
    2.  A "Retry" button is available if the IP detection fails.
*   **Data Sources**:
    *   External Service (`/api/ipify`): To get the user's public IP address.

### 3. Cloud Shell

*   **Sub-flow**: The form displays a message indicating that a predefined IP address for Cloud Shell will be used as the source.

### 4. Cloud Console SSH-in-browser

*   **Sub-flow**: The form displays a message explaining that the test will analyze connectivity from the user's IP via Identity Aware Proxy (IAP) to a selected VM.

### 5. VM Instance

*   **Sub-flow**:
    1.  User selects a VM instance from a dropdown list.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list available VM instances.

### 6. GKE... (Category)

*   **Sub-flow**: User selects one of the following GKE resource types:
    *   **GKE workload**:
        1.  Select a GKE cluster.
        2.  Select a GKE workload.
    *   **GKE pod**:
        1.  Select a GKE cluster.
        2.  Select a GKE pod.
    *   **GKE cluster control plane**:
        1.  Select a GKE cluster.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list GKE clusters, workloads, and pods.

### 7. Serverless... (Category)

*   **Sub-flow**: User selects a serverless resource (Cloud Run Service, Cloud Run Jobs, Cloud Function, App Engine).
*   **Data Sources**:
    *   `ResourceLoaderService`: To list available serverless resources.

### 8. Managed Data Services... (Category)

*   **Sub-flow**: User selects a managed data service (Alloy DB instance, Cloud SQL instance).
*   **Data Sources**:
    *   `ResourceLoaderService`: To list available data service instances.

### 9. CI/CD... (Category)

*   **Sub-flow**: User selects a Cloud Build private worker.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list Cloud Build private workers.

### 10. Subnetwork

*   **Sub-flow**:
    1.  User selects a Project.
    2.  User selects a VPC Network.
    3.  User selects a Subnetwork.
*   **Data Sources**:
    *   `ProjectService`: To list available projects.
    *   `ComputeEngineService`: To list VPC networks and subnetworks.

## III. Destination Endpoint Configuration

The user must select one of the following destination endpoint types:

### 1. IP Address

*   **Sub-flow**: User enters a valid IP address.

### 2. Domain Name

*   **Sub-flow**: User enters a valid domain name. The system will perform a DNS lookup to resolve the IP address.

### 3. Google APIs (via Private Access)

*   **Sub-flow**: User selects a Google API from a predefined list (e.g., Cloud Storage, Compute Engine).

### 4. VM Instance

*   **Sub-flow**: User selects a VM instance.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list available VM instances.

### 5. GKE... (Category)

*   **Sub-flow**: User selects a GKE resource (Cluster control plane, Workload, Pod, Service).
*   **Data Sources**:
    *   `ResourceLoaderService`: To list GKE resources.

### 6. Serverless... (Category)

*   **Sub-flow**: User selects a serverless resource.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list serverless resources.

### 7. Managed Data Services... (Category)

*   **Sub-flow**: User selects a managed data service.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list data service instances.

### 8. Application Endpoints... (Category)

*   **Sub-flow**: User selects an application endpoint (AppHub Service, IAP-protected resource, Load Balancer, PSC endpoint).
*   **Data Sources**:
    *   `ResourceLoaderService`: To list application endpoints.

### 9. CI/CD... (Category)

*   **Sub-flow**: User selects a Cloud Build private worker.
*   **Data Sources**:
    *   `ResourceLoaderService`: To list Cloud Build private workers.

### 10. Subnetwork

*   **Sub-flow**:
    1.  User selects a Project.
    2.  User selects a VPC Network.
    3.  User selects a Subnetwork.
*   **Data Sources**:
    *   `ProjectService`: To list projects.
    *   `ComputeEngineService`: To list VPCs and subnetworks.

## IV. Protocol and Test Name

1.  **Protocol**: User selects the protocol for the test (TCP, UDP, ICMP, etc.).
2.  **Destination Port**: If TCP or UDP is selected, a "Destination port" field is displayed and is required.
3.  **Test Name**: An auto-generated test name is displayed. The user can edit the name.
